"""
Database connection and utilities for MongoDB
"""
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_config
import logging

logger = logging.getLogger(__name__)

class Database:
    """MongoDB database handler"""
    
    def __init__(self, config=None):
        if config is None:
            config = get_config()
        self.config = config
        self.client = None
        self.db = None
        
    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.config.MONGODB_URI)
            self.db = self.client[self.config.MONGODB_DB_NAME]
            # Test connection
            self.client.server_info()
            logger.info(f"Connected to MongoDB: {self.config.MONGODB_DB_NAME}")
            return self.db
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def get_collection(self, collection_name):
        """Get a collection from database"""
        if self.db is None:
            self.connect()
        return self.db[collection_name]
    
    def get_jobs(self, query=None, limit=None):
        """Get jobs from database"""
        collection = self.get_collection('jobs')
        if query is None:
            query = {'is_active': True, 'status': 'approved'}
        
        cursor = collection.find(query)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    def get_candidates(self, query=None, limit=None):
        """Get candidates from database"""
        collection = self.get_collection('candidates')
        if query is None:
            query = {}
        
        cursor = collection.find(query)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    def get_applications(self, query=None, limit=None):
        """Get applications from database"""
        collection = self.get_collection('applications')
        if query is None:
            query = {}
        
        cursor = collection.find(query)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    def get_users(self, query=None, limit=None):
        """Get users from database"""
        collection = self.get_collection('users')
        if query is None:
            query = {}
        
        cursor = collection.find(query)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    def get_ai_recommendations(self, query=None, limit=None):
        """Get AI recommendations"""
        collection = self.get_collection('airecommendations')
        if query is None:
            query = {}
        
        cursor = collection.find(query)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    def save_ai_recommendation(self, recommendation):
        """Save AI recommendation to database"""
        collection = self.get_collection('airecommendations')
        result = collection.insert_one(recommendation)
        return result.inserted_id
    
    def bulk_save_recommendations(self, recommendations):
        """Bulk save recommendations"""
        collection = self.get_collection('airecommendations')
        result = collection.insert_many(recommendations)
        return result.inserted_ids
    
    def update_recommendation(self, recommendation_id, update_data):
        """Update a recommendation"""
        collection = self.get_collection('airecommendations')
        result = collection.update_one(
            {'_id': recommendation_id},
            {'$set': update_data}
        )
        return result.modified_count
    
    def get_user_preferences(self, user_id):
        """Get user preferences"""
        collection = self.get_collection('aiuserpreferences')
        return collection.find_one({'user_id': user_id})
    
    def save_user_preferences(self, preferences):
        """Save user preferences"""
        collection = self.get_collection('aiuserpreferences')
        result = collection.insert_one(preferences)
        return result.inserted_id
    
    def get_ai_feedback(self, query=None):
        """Get AI feedback"""
        collection = self.get_collection('aifeedbacks')
        if query is None:
            query = {}
        return list(collection.find(query))


class AsyncDatabase:
    """Async MongoDB database handler"""
    
    def __init__(self, config=None):
        if config is None:
            config = get_config()
        self.config = config
        self.client = None
        self.db = None
        
    async def connect(self):
        """Connect to MongoDB asynchronously"""
        try:
            self.client = AsyncIOMotorClient(self.config.MONGODB_URI)
            self.db = self.client[self.config.MONGODB_DB_NAME]
            # Test connection
            await self.db.command('ping')
            logger.info(f"Connected to MongoDB (async): {self.config.MONGODB_DB_NAME}")
            return self.db
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB (async): {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed (async)")


# Singleton instance
_db_instance = None

def get_database(async_mode=False):
    """Get database instance"""
    global _db_instance
    if _db_instance is None:
        if async_mode:
            _db_instance = AsyncDatabase()
        else:
            _db_instance = Database()
    return _db_instance
