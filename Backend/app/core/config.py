from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medussa ERP"
    SECRET_KEY: str = "medussa_secret_token_2026_debug" # Cambia esto por un string largo
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Configuración de DB
    DATABASE_URL: str = "postgresql://medussa_user:secure_password@localhost:5432/medussa_erp"

    class Config:
        env_file = ".env"

settings = Settings()