from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Proveedor(Base):
    __tablename__ = "proveedores"
    __table_args__ = {"schema": "compras"} # O el esquema que prefieras

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    nit = Column(String(20), nullable=False)
    nombre_razon_social = Column(String(100), nullable=False)
    contacto_nombre = Column(String(100))
    email = Column(String(100))
    telefono = Column(String(20))
    categoria = Column(String(50)) # Materia Prima, Insumos, Servicios
    estado = Column(String(20), default="Activo")
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())