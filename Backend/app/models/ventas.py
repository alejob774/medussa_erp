from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, func
from app.db.session import Base

class FacturaVenta(Base):
    __tablename__ = "facturas_venta"
    __table_args__ = {"schema": "ventas"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    cliente_id = Column(Integer, nullable=False)
    total_venta = Column(Numeric(14, 2))
    total_costo_venta = Column(Numeric(14, 2))
    margen_bruto = Column(Numeric(14, 2))
    fecha_emision = Column(DateTime, server_default=func.now())