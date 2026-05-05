from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    producto_sku = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=True)
    familia = Column(String(100), nullable=True)
    uom_base = Column(String(20), nullable=True) # Unidad de Medida
    
    # Flags de control
    maneja_lote = Column(Boolean, default=False)
    maneja_venc = Column(Boolean, default=False)
    metodo_costo = Column(String(50), default="Promedio") # Promedio, PEPS, UEPS
    estado = Column(Boolean, default=True) # Para borrado lógico
    producto_status = Column(String(20), default="Activo")
    
    # Multi-tenant
    empresa_id = Column(String(50), index=True, nullable=False)
    
    # Relaciones
    saldos = relationship("InventarioSaldo", back_populates="producto")
    kardex = relationship("InventarioKardex", back_populates="producto")

class InventarioSaldo(Base):
    __tablename__ = "inventario_saldos"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    bodega_id = Column(Integer, index=True, nullable=False)
    lote_id = Column(String(100), nullable=True)
    
    cantidad_fisica = Column(Numeric(18, 4), default=0.0)
    cantidad_reservada = Column(Numeric(18, 4), default=0.0)
    
    empresa_id = Column(String(50), index=True, nullable=False)

    @property
    def cantidad_disponible(self):
        return self.cantidad_fisica - self.cantidad_reservada

    producto = relationship("Producto", back_populates="saldos")

class InventarioKardex(Base):
    __tablename__ = "inventario_kardex"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    bodega_id = Column(Integer, nullable=False)
    tipo_movimiento = Column(String(50), nullable=False) # COMPRA, VENTA, AJUSTE, etc.
    cantidad = Column(Numeric(18, 4), nullable=False)
    lote_id = Column(String(100), nullable=True)
    documento_referencia = Column(String(100), nullable=True)
    
    fecha_movimiento = Column(DateTime(timezone=True), server_default=func.now())
    empresa_id = Column(String(50), index=True, nullable=False)

    producto = relationship("Producto", back_populates="kardex")