"""
Green Analytical Chemistry Software - Main Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import sys
import io

from app.api.routes import router
from app.core.config import settings
from app.database.connection import init_db

# Force UTF-8 encoding for stdout/stderr to avoid GBK errors
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Initialize database on startup
    await init_db()
    yield
    # Cleanup resources on shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="HPLC Green Analytical Chemistry System",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Green Analytical Chemistry API",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import sys
    import os
    import socket
    
    # 检测是否是PyInstaller打包的exe
    is_frozen = getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')
    
    # 检查端口是否已被占用
    def is_port_in_use(port, host='127.0.0.1'):
        """检查端口是否已被占用"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return False
            except socket.error:
                return True
    
    # 检查端口8000是否可用
    if is_port_in_use(settings.PORT, settings.HOST):
        print(f"❌ 错误: 端口 {settings.PORT} 已被占用")
        print(f"可能的原因:")
        print(f"  1. 另一个 LC GAUGE 实例正在运行")
        print(f"  2. 其他程序正在使用端口 {settings.PORT}")
        print(f"解决方案:")
        print(f"  - 请关闭其他 LC GAUGE 实例")
        print(f"  - 或关闭占用该端口的其他程序")
        sys.exit(1)
    
    try:
        if is_frozen:
            # 打包环境：直接传app对象，禁用热重载
            print(f"🚀 启动后端服务: {settings.HOST}:{settings.PORT}")
            uvicorn.run(
                app,  # 直接传app对象
                host=settings.HOST,
                port=settings.PORT,
                reload=False
            )
        else:
            # 开发环境：传模块路径，支持热重载
            print(f"🚀 启动后端服务 (开发模式): {settings.HOST}:{settings.PORT}")
            uvicorn.run(
                "main:app",
                host=settings.HOST,
                port=settings.PORT,
                reload=settings.DEBUG
            )
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")
        sys.exit(1)

