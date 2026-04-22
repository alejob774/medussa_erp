from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class DemandaAnalisis(Base):
    __tablename__ = "scm_demanda_analisis"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    sku_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    periodo = Column(Date, nullable=False) # Mes/Año del análisis
    
    ventas_reales = Column(Numeric(12, 2), default=0)
    forecast_planeado = Column(Numeric(12, 2), default=0)
    
    # Indicadores calculados
    mape = Column(Numeric(10, 4))  # Mean Absolute Percentage Error
    sesgo = Column(Numeric(10, 4)) # Bias
    
    fecha_proceso = Column(DateTime(timezone=True), server_default=func.now())

class DemandaAlerta(Base):
    __tablename__ = "demanda_alerta"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    sku_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    tipo_alerta = Column(String(50)) # "Error Crítico", "Sobre-pronóstico", "Bajo-pronóstico"
    severidad = Column(String(20)) # "Alta", "Media", "Baja"
    descripcion = Column(String(255))
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())