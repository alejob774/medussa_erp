from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

# Tabla asociativa para la relación Conductor -> Rutas [cite: 161, 278]
conductor_ruta = Table(
    "conductor_ruta",
    Base.metadata,
    Column("conductor_id", Integer, ForeignKey("configuracion.conductores.id"), primary_key=True),
    Column("ruta_id", Integer, ForeignKey("configuracion.rutas.id"), primary_key=True),
    schema="configuracion"
)

class Conductor(Base):
    __tablename__ = "conductores"
    __table_args__ = {"schema": "configuracion"}

    id = Column(Integer, primary_key=True, index=True)
    id_con = Column(String(20), unique=True, nullable=False, index=True) # [cite: 176]
    nombre_con = Column(String(150), nullable=False) # [cite: 176]
    estado = Column(Boolean, default=True) # Soft Delete [cite: 174, 281]
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con Rutas
    rutas = relationship("Ruta", secondary=conductor_ruta, back_populates="conductores")

class Ruta(Base):
    __tablename__ = "rutas"
    __table_args__ = {"schema": "configuracion"}
    
    id = Column(Integer, primary_key=True, index=True)
    id_rut = Column(String(20), unique=True, nullable=False)
    nombre_rut = Column(String(100), nullable=False)
    estado = Column(Boolean, default=True)
    
    conductores = relationship("Conductor", secondary=conductor_ruta, back_populates="rutas")