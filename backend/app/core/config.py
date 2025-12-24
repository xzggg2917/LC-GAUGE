"""
Application Configuration Module
"""
from pydantic_settings import BaseSettings
from typing import List
import os
import sys
from pathlib import Path


def get_data_dir() -> Path:
    """
    获取数据存储目录
    - 开发环境: backend/data/
    - 打包环境: 用户数据目录/LC_GAUGE/backend/
    """
    if getattr(sys, 'frozen', False):
        # 打包后环境：使用用户数据目录
        if sys.platform == 'win32':
            base_dir = Path(os.environ.get('APPDATA', '')) / 'LC_GAUGE' / 'backend'
        elif sys.platform == 'darwin':
            base_dir = Path.home() / 'Library' / 'Application Support' / 'LC_GAUGE' / 'backend'
        else:
            base_dir = Path.home() / '.lc_gauge' / 'backend'
    else:
        # 开发环境：使用当前目录的data文件夹
        base_dir = Path(__file__).parent.parent.parent / 'data'
    
    # 确保目录存在
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


# 获取数据目录
DATA_DIR = get_data_dir()
DATABASE_PATH = DATA_DIR / 'hplc_analysis.db'


class Settings(BaseSettings):
    """Application Settings"""
    
    # Project Information
    PROJECT_NAME: str = "Green Analytical Chemistry System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # CORS配置
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ]
    
    # 数据库配置
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATABASE_PATH}"
    
    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略环境变量中的额外字段


settings = Settings()
