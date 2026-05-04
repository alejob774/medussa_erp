from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class OeeRegistro(Base):
    __tablename__ = "oee_registros"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    
    disponibilidad = Column(Float, default=0.0)
    rendimiento = Column(Float, default=0.0)
    calidad = Column(Float, default=0.0)
    oee_total = Column(Float, default=0.0)

class CalidadInspeccion(Base):
    __tablename__ = "calidad_inspecciones"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    lote_id = Column(String(100), nullable=True)
    
    cantidad_muestra = Column(Float, nullable=False)
    defectos_encontrados = Column(Integer, default=0)
    resultado_final = Column(String(50)) # APROBADO, RECHAZADO, CONDICIONAL
    liberado = Column(Boolean, default=False)
    observaciones = Column(Text, nullable=True)

class TpmOrdenTrabajo(Base):
    __tablename__ = "tpm_ordenes"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tipo_mantenimiento = Column(String(50)) # PREVENTIVO, CORRECTIVO
    estado = Column(String(20), default="ABIERTA") # ABIERTA, EN_PROCESO, CERRADA
    descripcion_falla = Column(Text)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())