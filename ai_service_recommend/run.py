"""
Main entry point for AI Service
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.app import app
from config import get_config

if __name__ == '__main__':
    config = get_config()
    
    print(f"Starting AI Recommendation Service...")
    print(f"Environment: {config.FLASK_ENV}")
    print(f"Host: {config.API_HOST}")
    print(f"Port: {config.API_PORT}")
    print(f"Model Version: {config.MODEL_VERSION}")
    print(f"MongoDB: {config.MONGODB_URI}")
    
    app.run(
        host=config.API_HOST,
        port=config.API_PORT,
        debug=config.FLASK_DEBUG
    )



## đầu tiên /api/product/foryou - ở python mình sẽ làm FLask API
## tạo model -> gọi model để tính toán từ api foryou
## làm sao để làm model
## thu thập dữ liệu
## Xử lý dữ liệu
## kết hợp thuật toán 
## training dữ liệu với 80% dùng để train còn 20% để test
## X,y, x_train,y_train
