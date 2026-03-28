from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Configuración General
    PROJECT_NAME: str = "Medussa ERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Seguridad (¡Cámbialas en producción!)
    SECRET_KEY: str = "7e7f6e8b9d8a7c6b5a4d3e2f1g0h9i8j7k6l5m4n3o2p1q" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        case_sensitive = True

settings = Settings()