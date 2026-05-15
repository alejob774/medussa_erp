from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ------------------------------------------
# 1. CONFIGURACIÓN DB TRANSACCIONAL (MEDUSSA)
# ------------------------------------------
SQLALCHEMY_DATABASE_URL = "postgresql://medussa_user:secure_password@localhost:5432/medussa_erp"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10, 
    max_overflow=20,
    echo=False 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ------------------------------------------
# 2. CONFIGURACIÓN DB ANALÍTICA (BI / DW)
# ------------------------------------------
# Esta base de datos aloja las tablas de hechos (fact_) y dimensiones (dim_)
BI_DATABASE_URL = "postgresql://bi_user:bi_secure_password@localhost:5432/bi"

engine_bi = create_engine(
    BI_DATABASE_URL,
    pool_size=5,        # Pool menor ya que son consultas de lectura pesadas
    max_overflow=10,
    echo=False
)

SessionBI = sessionmaker(autocommit=False, autoflush=False, bind=engine_bi)

# ------------------------------------------
# 3. BASE Y DEPENDENCIAS
# ------------------------------------------
Base = declarative_base()

# Dependencia para Operaciones Transaccionales (Ventas, Inventario, etc.)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependencia para Reportes y Analítica (HU-033 a HU-038)
def get_bi_db():
    db = SessionBI()
    try:
        yield db
    finally:
        db.close()
