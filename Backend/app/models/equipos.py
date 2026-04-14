from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Equipo(Base):
    __tablename__ = "equipos"
    __table_args__ = {"schema": "configuracion", "extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    id_maq = Column(String(20), unique=True, nullable=False, index=True)
    nombre_maq = Column(String(150), nullable=False)
    marca = Column(String(100))
    modelo = Column(String(100))
    serie = Column(String(100))
    especificaciones_tecnicas = Column(Text)
    empresa_fabricante = Column(String(150))
    contacto_fabricante = Column(String(100)) # Email solicitado en HU
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())