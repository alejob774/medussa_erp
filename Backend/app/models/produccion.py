from sqlalchemy import Column, Integer, String, Numeric, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class OrdenProduccion(Base):
    __tablename__ = "ordenes_produccion"
    # Se eliminó el esquema específico para mantener compatibilidad con la base de datos actual
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_producida = Column(Numeric(14, 2), default=0.0)
    
    # Desglose de Costos (HEAD)
    costo_mp = Column(Numeric(14, 2), default=0.0)    # Materia Prima
    costo_mo = Column(Numeric(14, 2), default=0.0)    # Mano de Obra
    costo_ind = Column(Numeric(14, 2), default=0.0)   # Indirectos
    costo_unitario_final = Column(Numeric(14, 2), default=0.0)
    
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

class OeeRegistro(Base):
    """Métricas de Efectividad Global de Equipos (Back)."""
    __tablename__ = "oee_registros"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    
    disponibilidad = Column(Float, default=0.0)
    rendimiento = Column(Float, default=0.0)
    calidad = Column(Float, default=0.0)
    oee_total = Column(Float, default=0.0)

class CalidadInspeccion(Base):
    """Control de Calidad en Planta (Back)."""
    __tablename__ = "calidad_inspecciones"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    lote_id = Column(String(100), nullable=True)
    
    cantidad_muestra = Column(Float, nullable=False)
    defectos_encontrados = Column(Integer, default=0)
    resultado_final = Column(String(50)) # APROBADO, RECHAZADO, CONDICIONAL
    liberado = Column(Boolean, default=False)
    observaciones = Column(Text, nullable=True)

class TpmOrdenTrabajo(Base):
    """Gestión de Mantenimiento Productivo Total (Back)."""
    __tablename__ = "tpm_ordenes"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tipo_mantenimiento = Column(String(50)) # PREVENTIVO, CORRECTIVO
    estado = Column(String(20), default="ABIERTA") # ABIERTA, EN_PROCESO, CERRADA
    descripcion_falla = Column(Text)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())