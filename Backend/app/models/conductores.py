from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

# Tabla asociativa corregida: apunta al esquema 'logistica' para las rutas
conductor_ruta = Table(
    "conductor_ruta",
    Base.metadata,
    Column("conductor_id", Integer, ForeignKey("configuracion.conductores.id"), primary_key=True),
    Column("ruta_id", Integer, ForeignKey("logistica.rutas.id"), primary_key=True),
    schema="configuracion"
)

class Conductor(Base):
    __tablename__ = "conductores"
    __table_args__ = {"schema": "configuracion", "extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    id_con = Column(String(20), unique=True, nullable=False, index=True)
    nombre_con = Column(String(150), nullable=False)
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # RELACIÓN CORREGIDA: Apunta por nombre de string a la clase en logistica.py
    rutas = relationship("Ruta", secondary=conductor_ruta, back_populates="conductores")

# ELIMINA COMPLETAMENTE LA CLASE 'Ruta' QUE ESTABA AQUÍ ABAJO