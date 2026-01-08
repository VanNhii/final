"""
Model Trainer for job recommendation system
Supports multiple algorithms: Random Forest, Gradient Boosting, Neural Networks
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report
)
from sklearn.decomposition import TruncatedSVD
from scipy.sparse.linalg import svds
import joblib
import logging
from datetime import datetime
from .data_pipeline import DataPipeline
from .feature_engineering import FeatureEngineer
from config import get_config

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Train and manage recommendation models"""
    
    def __init__(self, model_type='random_forest', config=None):
        if config is None:
            config = get_config()
        self.config = config
        self.model_type = model_type
        self.model = None
        self.feature_engineer = FeatureEngineer()
        self.data_pipeline = DataPipeline()
        self.feature_columns = []
        self.metadata = {
            'version': config.MODEL_VERSION,
            'trained_at': None,
            'model_type': model_type,
            'metrics': {}
        }
    
    def prepare_data(self, days_back=180):
        """Prepare training data"""
        logger.info("Preparing training data...")
        
        # Extract raw data
        df = self.data_pipeline.extract_training_data(days_back=days_back)
        
        if df.empty:
            logger.error("No training data available!")
            return None, None, None, None
        
        # Preprocess features
        df, feature_columns = self.data_pipeline.preprocess_features(df)
        self.feature_columns = feature_columns
        
        # Separate features and labels
        X = df[feature_columns].values
        y = df['label'].values
        
        logger.info(f"Training data shape: X={X.shape}, y={y.shape}")
        logger.info(f"Positive samples: {y.sum()}, Negative samples: {len(y) - y.sum()}")
        
        # Check minimum samples required for train/test split
        min_samples_required = 10  # Increased minimum samples needed for split
        if len(y) < min_samples_required:
            logger.warning(f"Insufficient training samples: {len(y)}. Need at least {min_samples_required} for split.")
            # If we have very few samples, use all for training (no test split)
            if len(y) >= 2:
                logger.info("Using all available data for training (no test split)")
                return X, None, y, None
            else:
                logger.error("Not enough samples to train. Need at least 2 samples.")
                return None, None, None, None
        
        # Determine if we can stratify
        n_classes = len(np.unique(y))
        # Estimate test size (sklearn uses ceil usually, but safe estimate is floor or just check ratio)
        test_size_samples = int(np.ceil(len(y) * self.config.VALIDATION_SPLIT))
        
        should_stratify = (
            n_classes > 1 and 
            y.sum() >= 2 and 
            (len(y) - y.sum()) >= 2 and
            test_size_samples >= n_classes  # Ensure test set can represent all classes
        )
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=self.config.VALIDATION_SPLIT,
            random_state=42,
            stratify=y if should_stratify else None
        )
        
        return X_train, X_test, y_train, y_test
    
    def train(self, days_back=180):
        """Train the recommendation model"""
        logger.info(f"Starting model training with {self.model_type}...")
        
        # Prepare data
        X_train, X_test, y_train, y_test = self.prepare_data(days_back)
        
        if X_train is None:
            logger.error("Failed to prepare training data")
            return False
        
        # Initialize model
        if self.model_type == 'random_forest':
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
                class_weight='balanced'
            )
        elif self.model_type == 'gradient_boosting':
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=self.config.LEARNING_RATE,
                max_depth=5,
                min_samples_split=5,
                random_state=42
            )
        else:
            logger.error(f"Unsupported model type: {self.model_type}")
            return False
        
        # Train model
        logger.info("Training model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate
        logger.info("Evaluating model...")
        if X_test is not None and y_test is not None:
            metrics = self.evaluate(X_test, y_test)
        else:
            # No test set available, create minimal metrics
            logger.warning("No test set available for evaluation. Using training metrics.")
            metrics = {
                'accuracy': 0.0,
                'precision': 0.0,
                'recall': 0.0,
                'f1': 0.0,
                'roc_auc': 0.0,
                'note': 'Insufficient data for proper evaluation'
            }
        self.metadata['metrics'] = metrics
        self.metadata['trained_at'] = datetime.utcnow().isoformat()
        
        # Log metrics
        logger.info("Training completed!")
        logger.info(f"Accuracy: {metrics.get('accuracy', 0):.4f}")
        logger.info(f"Precision: {metrics.get('precision', 0):.4f}")
        logger.info(f"Recall: {metrics.get('recall', 0):.4f}")
        logger.info(f"F1 Score: {metrics.get('f1', 0):.4f}")
        logger.info(f"ROC AUC: {metrics.get('roc_auc', 0):.4f}")
        
        return True
    
    def evaluate(self, X_test, y_test):
        """Evaluate model performance"""
        if self.model is None:
            logger.error("Model not trained yet!")
            return {}
        
        # Predictions
        y_pred = self.model.predict(X_test)
        
        # Handle predict_proba for single class case
        if hasattr(self.model, 'predict_proba'):
            proba = self.model.predict_proba(X_test)
            # If only one class, use that probability
            if proba.shape[1] == 1:
                y_pred_proba = proba[:, 0]
            else:
                y_pred_proba = proba[:, 1]
        else:
            y_pred_proba = y_pred
        
        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='binary', zero_division=0),
            'recall': recall_score(y_test, y_pred, average='binary', zero_division=0),
            'f1': f1_score(y_test, y_pred, average='binary', zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.0
        }
        
        return metrics
    
    def predict_proba(self, X):
        """Predict probability scores"""
        if self.model is None:
            logger.error("Model not trained yet!")
            return None
        
        if hasattr(self.model, 'predict_proba'):
            proba = self.model.predict_proba(X)
            if proba.shape[1] == 1:
                return proba[:, 0]
            return proba[:, 1]
        else:
            return self.model.predict(X)
    
    def get_feature_importance(self):
        """Get feature importance scores"""
        if self.model is None or not hasattr(self.model, 'feature_importances_'):
            return {}
        
        importance = self.model.feature_importances_
        feature_importance = dict(zip(self.feature_columns, importance))
        
        # Sort by importance
        sorted_importance = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return sorted_importance
    
    def save_model(self, filename=None):
        """Save trained model to disk"""
        if self.model is None:
            logger.error("No model to save!")
            return False
        
        if filename is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.config.MODEL_PATH}/job_recommender_{self.model_type}_{timestamp}.pkl"
        
        try:
            # Close database connections before pickling to avoid SSL context issues
            if hasattr(self.data_pipeline, 'db') and hasattr(self.data_pipeline.db, 'client'):
                self.data_pipeline.db.close()
            
            model_data = {
                'model': self.model,
                'feature_columns': self.feature_columns,
                'feature_engineer': self.feature_engineer,
                'metadata': self.metadata
                # Note: Don't save data_pipeline with active DB connection
            }
            
            joblib.dump(model_data, filename)
            logger.info(f"Model saved to {filename}")
            
            # Also save as latest
            latest_filename = f"{self.config.MODEL_PATH}/job_recommender_latest.pkl"
            joblib.dump(model_data, latest_filename)
            logger.info(f"Model saved as latest: {latest_filename}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            return False
    
    def load_model(self, filename=None):
        """Load trained model from disk"""
        if filename is None:
            filename = f"{self.config.MODEL_PATH}/job_recommender_latest.pkl"
        
        try:
            model_data = joblib.load(filename)
            
            self.model = model_data['model']
            self.feature_columns = model_data['feature_columns']
            self.feature_engineer = model_data['feature_engineer']
            self.metadata = model_data['metadata']
            # Re-initialize data_pipeline with fresh DB connection
            # self.data_pipeline will be created when needed
            
            logger.info(f"Model loaded from {filename}")
            logger.info(f"Model version: {self.metadata.get('version')}")
            logger.info(f"Trained at: {self.metadata.get('trained_at')}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False


class CollaborativeFilteringModel:
    """Collaborative Filtering using Matrix Factorization"""
    
    def __init__(self, n_factors=50, config=None):
        if config is None:
            config = get_config()
        self.config = config
        self.n_factors = n_factors
        self.user_factors = None
        self.item_factors = None
        self.user_ids = []
        self.item_ids = []
        self.data_pipeline = DataPipeline()
        self._warned_users = set()
        self.metadata = {
            'version': config.MODEL_VERSION,
            'trained_at': None,
            'model_type': 'collaborative_filtering',
            'n_factors': n_factors
        }
    
    def train(self):
        """Train collaborative filtering model"""
        logger.info("Training collaborative filtering model...")
        
        # Extract interaction data
        interactions_df = self.data_pipeline.extract_user_interaction_data()
        
        if interactions_df.empty:
            logger.warning("No interaction data available for collaborative filtering!")
            return False
        
        # Create interaction matrix
        matrix, user_ids, item_ids = self.data_pipeline.create_interaction_matrix(interactions_df)
        
        if matrix.empty:
            logger.warning("Failed to create interaction matrix!")
            return False
        
        self.user_ids = [str(uid) for uid in user_ids]
        self.item_ids = [str(iid) for iid in item_ids]
        
        # Apply matrix factorization (SVD)
        logger.info("Applying matrix factorization...")
        matrix_values = matrix.values.astype(float)
        
        # Determine optimal number of factors based on matrix size
        # SVD requires k < min(matrix dimensions) - 1
        max_factors = min(matrix_values.shape[0], matrix_values.shape[1]) - 1
        
        # Need at least 2 factors for meaningful decomposition
        if max_factors < 2:
            logger.warning(f"Matrix too small for SVD: {matrix_values.shape}. Need at least 3x3 matrix.")
            return False
        
        # Use smaller of configured factors or maximum possible
        k_factors = min(self.n_factors, max_factors)
        logger.info(f"Using {k_factors} factors (max possible: {max_factors}, configured: {self.n_factors})")
        
        try:
            U, sigma, Vt = svds(matrix_values, k=k_factors)
            self.user_factors = U
            self.item_factors = Vt.T
            
            logger.info(f"User factors shape: {self.user_factors.shape}")
            logger.info(f"Item factors shape: {self.item_factors.shape}")
            
            self.metadata['trained_at'] = datetime.utcnow().isoformat()
            self.metadata['n_factors'] = k_factors
            return True
        except Exception as e:
            logger.error(f"Matrix factorization failed: {e}")
            return False
    
    def predict(self, user_id, item_ids=None):
        """Predict ratings for user-item pairs"""
        if self.user_factors is None or self.item_factors is None:
            logger.error("Model not trained yet!")
            return {}

        user_key = str(user_id) if user_id is not None else ""
        if user_key not in self.user_ids:
            if user_key and user_key not in self._warned_users:
                logger.warning(f"User {user_key} not in training data")
                self._warned_users.add(user_key)
            return {}

        user_idx = self.user_ids.index(user_key)
        user_vector = self.user_factors[user_idx]
        
        if item_ids is None:
            # Predict for all items
            predictions = np.dot(user_vector, self.item_factors.T)
            return dict(zip(self.item_ids, predictions))
        else:
            # Predict for specific items
            predictions = {}
            for item_id in item_ids:
                item_key = str(item_id) if item_id is not None else ""
                if item_key in self.item_ids:
                    item_idx = self.item_ids.index(item_key)
                    item_vector = self.item_factors[item_idx]
                    score = np.dot(user_vector, item_vector)
                    predictions[item_key] = score
            return predictions
    
    def save_model(self, filename=None):
        """Save collaborative filtering model"""
        if self.user_factors is None:
            logger.error("No model to save!")
            return False
        
        if filename is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.config.MODEL_PATH}/cf_model_{timestamp}.pkl"
        
        try:
            model_data = {
                'user_factors': self.user_factors,
                'item_factors': self.item_factors,
                'user_ids': self.user_ids,
                'item_ids': self.item_ids,
                'metadata': self.metadata
            }
            
            joblib.dump(model_data, filename)
            logger.info(f"CF Model saved to {filename}")
            
            # Save as latest
            latest_filename = f"{self.config.MODEL_PATH}/cf_model_latest.pkl"
            joblib.dump(model_data, latest_filename)
            
            return True
        except Exception as e:
            logger.error(f"Failed to save CF model: {e}")
            return False
    
    def load_model(self, filename=None):
        """Load collaborative filtering model"""
        if filename is None:
            filename = f"{self.config.MODEL_PATH}/cf_model_latest.pkl"
        
        try:
            model_data = joblib.load(filename)
            
            self.user_factors = model_data['user_factors']
            self.item_factors = model_data['item_factors']
            self.user_ids = model_data['user_ids']
            self.item_ids = model_data['item_ids']
            self.metadata = model_data['metadata']
            
            logger.info(f"CF Model loaded from {filename}")
            return True
        except Exception as e:
            logger.error(f"Failed to load CF model: {e}")
            return False
