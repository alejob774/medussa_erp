from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración oficial de Medussa ERP
# Formato: postgresql://usuario:password@host:puerto/nombre_bd
# app/db/session.py
SQLALCHEMY_DATABASE_URL = "postgresql://medussa_user:secure_password@localhost:5432/medussa_erp"
# Configuración del Engine con Pooling para escalabilidad
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # pool_size: número de conexiones permanentes
    pool_size=10, 
    # max_overflow: conexiones extra si se agota el pool
    max_overflow=20,
    # Ayuda a debuggear viendo los queries en consola (opcional: True)
    echo=False 
)

# Constructor de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para que los modelos hereden de ella
Base = declarative_base()

# Dependencia para FastAPI: Inyecta la sesión en cada request y la cierra al terminar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()