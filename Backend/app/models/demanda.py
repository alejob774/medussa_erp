from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

# --- MODELOS DE REGISTRO (HU-025) ---

class Forecast(Base):
    __tablename__ = "scm_forecast"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    version = Column(String(20), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    estado = Column(String(20), default="BORRADOR")
    usuario_crea = Column(String(100))
    fecha_crea = Column(DateTime(timezone=True), server_default=func.now())

class ForecastDetalle(Base):
    __tablename__ = "scm_forecast_detalle"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("scm.scm_forecast.id"), nullable=False)
    producto_id = Column(Integer, nullable=False)
    cantidad_historica = Column(Numeric(12, 2), default=0)
    cantidad_forecast = Column(Numeric(12, 2), nullable=False) # Sugerido por sistema
    ajuste_manual = Column(Numeric(12, 2), default=0)
    cantidad_final = Column(Numeric(12, 2), nullable=False) # Forecast + Ajuste
    observaciones = Column(Text)

# --- MODELOS ANALÍTICOS (HU-026) ---

class DemandaAnalisis(Base):
    __tablename__ = "scm_demanda_analisis"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    sku_id = Column(Integer, nullable=False)
    periodo = Column(Date, nullable=False)
    ventas_reales = Column(Numeric(12, 2), default=0)
    forecast_planeado = Column(Numeric(12, 2), default=0)
    mape = Column(Numeric(12, 4)) # Error porcentual
    sesgo = Column(Numeric(12, 2)) # Diferencia absoluta
    fecha_calculo = Column(DateTime(timezone=True), server_default=func.now())

class DemandaAlerta(Base):
    __tablename__ = "scm_demanda_alerta"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    sku_id = Column(Integer, nullable=False)
    tipo_alerta = Column(String(50)) # "DESVIACION_CRITICA", "VENTA_NULA"
    severidad = Column(String(20)) # "ALTA", "MEDIA"
    descripcion = Column(Text)
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())