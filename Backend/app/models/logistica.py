# app/models/logistica.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Ruta(Base):
    __tablename__ = "rutas"
    __table_args__ = {"schema": "logistica", "extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    id_rut = Column(String(20), unique=True, nullable=False, index=True)
    nombre_rut = Column(String(150), nullable=False)
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación con Conductores
    conductores = relationship("Conductor", secondary="configuracion.conductor_ruta", back_populates="rutas")