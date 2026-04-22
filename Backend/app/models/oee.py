from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class OEE_Registro(Base):
    __tablename__ = "produccion_oee_registro"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("configuracion.equipos.id"), nullable=False)
    
    fecha = Column(Date, nullable=False)
    turno = Column(String(20))
    tiempo_programado = Column(Float)  # Minutos
    tiempo_parado = Column(Float)      # Minutos
    unidades_producidas = Column(Float)
    unidades_objetivo = Column(Float)
    unidades_rechazadas = Column(Float)
    
    # Resultados calculados
    disponibilidad = Column(Float)
    rendimiento = Column(Float)
    calidad = Column(Float)
    oee_total = Column(Float)
    
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())