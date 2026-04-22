from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class TPMPlan(Base):
    __tablename__ = "tpm_planes"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("configuracion.equipos.id"), nullable=False)
    tipo = Column(String(30)) # PREVENTIVO, CORRECTIVO, SANITARIO, CALIBRACION
    frecuencia_dias = Column(Integer, nullable=True)
    descripcion_actividades = Column(Text)
    activo = Column(Boolean, default=True)

class TPMOrdenTrabajo(Base):
    __tablename__ = "tpm_ordenes_trabajo"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("configuracion.equipos.id"), nullable=False)
    tipo = Column(String(30))
    estado = Column(String(20), default="ABIERTA") # ABIERTA, EN_PROCESO, CERRADA, CANCELADA
    fecha_programada = Column(Date)
    fecha_cierre = Column(DateTime, nullable=True)
    tecnico_asignado = Column(String(100))
    tiempo_reparacion = Column(Integer, nullable=True) # Minutos
    costo_estimado = Column(Float, default=0.0)
    observaciones = Column(Text)