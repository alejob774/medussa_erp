from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
    producto_sku = Column(String(100), unique=True, index=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500), nullable=True)
    maneja_lote = Column(Boolean, default=False, nullable=False)
    estado = Column(Boolean, default=True, nullable=False)
    empresa_id = Column(String(50), nullable=False)

class InventarioSaldo(Base):
    __tablename__ = "inventario_saldos"
    
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    bodega_id = Column(Integer, nullable=False)
    lote_id = Column(String(100), nullable=True)
    empresa_id = Column(String(50), nullable=False)
    
    cantidad_fisica = Column(Float, default=0.0)
    cantidad_reservada = Column(Float, default=0.0)
    cantidad_bloqueada = Column(Float, default=0.0)

    @property
    def cantidad_disponible(self):
        return self.cantidad_fisica - self.cantidad_reservada - self.cantidad_bloqueada

class InventarioKardex(Base):
    __tablename__ = "inventario_kardex"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    bodega_id = Column(Integer, nullable=False)
    cantidad = Column(Float, nullable=False) # Positivo entrada, Negativo salida
    tipo_movimiento = Column(String(50), nullable=False)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    documento_referencia = Column(String(100), nullable=True)
    lote_id = Column(String(100), nullable=True)