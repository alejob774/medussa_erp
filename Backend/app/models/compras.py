from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Proveedor(Base):
    __tablename__ = "proveedores"
    __table_args__ = {"schema": "compras", "extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    ciudad = Column(String(100), nullable=False)
    direccion = Column(String(200), nullable=False)
    telefono = Column(String(20), nullable=False)
    nit = Column(String(20), unique=True, nullable=False, index=True)
    producto = Column(String(150)) # Producto principal
    estado = Column(Boolean, default=True) # Soft Delete
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())