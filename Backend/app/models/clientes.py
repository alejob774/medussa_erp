from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Cliente(Base):
    __tablename__ = "clientes"
    __table_args__ = {"schema": "configuracion"} # Ajustar esquema según corresponda

    id = Column(Integer, primary_key=True, index=True)
    id_cli = Column(String(20), unique=True, nullable=False, index=True) # NIT/Cédula
    nombre = Column(String(150), nullable=False)
    nombre_comercial = Column(String(150), nullable=True)
    direccion = Column(String(200), nullable=False)
    ciudad = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    estado = Column(Boolean, default=True) # Para eliminación lógica (Soft Delete)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())