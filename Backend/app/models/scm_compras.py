from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime, Float
from sqlalchemy.sql import func
from app.db.session import Base

class CompraAnalisis(Base):
    __tablename__ = "scm_compra_analisis"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("compras.proveedores.id"), nullable=False)
    periodo = Column(Date, nullable=False)
    total_comprado = Column(Numeric(15, 2), default=0)
    lead_time_promedio = Column(Float) # Días
    calidad_score = Column(Float) # 1 a 5
    cumplimiento_score = Column(Float) # % de entregas a tiempo

class CompraPrecioHistorico(Base):
    __tablename__ = "scm_compra_precio_historico"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    item_id = Column(Integer, nullable=False) # Relacionado a inventario.productos
    proveedor_id = Column(Integer, ForeignKey("compras.proveedores.id"), nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    fecha_compra = Column(Date, server_default=func.current_date())