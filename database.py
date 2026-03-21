from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración basada en el estándar del proyecto [cite: 49]
SQLALCHEMY_DATABASE_URL = "postgresql://medussa_user:secure_password@localhost:5432/medussa_erp"

# Engine con pooling para manejar concurrencia [cite: 63, 66]
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10, 
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependencia para FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()