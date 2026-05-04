from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class CostoSku(Base):
    __tablename__ = "costos_sku"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    
    # Costo Promedio Ponderado (CPP) o Último Costo
    costo_promedio = Column(Float, default=0.0)
    ultimo_costo = Column(Float, default=0.0)
    ultima_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

class CostoMovimiento(Base):
    __tablename__ = "costos_movimientos"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    # Vínculo de idempotencia con el movimiento de inventario
    inventario_kardex_id = Column(Integer, ForeignKey("inventario_kardex.id"), unique=True)
    
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Float, nullable=False)
    costo_unitario = Column(Float, nullable=False)
    costo_total = Column(Float, nullable=False) # cantidad * costo_unitario
    tipo_afectacion = Column(String(20)) # 'DEBE' (Entrada), 'HABER' (Salida)