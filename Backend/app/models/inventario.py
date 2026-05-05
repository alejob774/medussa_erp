<<<<<<< HEAD
from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime, func
=======
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
>>>>>>> Back
from app.db.session import Base

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
<<<<<<< HEAD
    producto_nom = Column(String(50), nullable=False)
    producto_sku = Column(String(50), nullable=False) 
    producto_fam = Column(String(50), nullable=False)
    producto_descrip = Column(String(200), nullable=False)
    uom_base = Column(String(10), nullable=False)
    producto_status = Column(String(10), default="Activo")
    empresa_id = Column(String(50), nullable=False)
    metodo_costo = Column(String(20), default="Promedio") # FIFO o Promedio[cite: 22]

class MovimientoInventario(Base):
    __tablename__ = "inv_movimientos"
    __table_args__ = {"schema": "inventario"}

    id = Column(Integer, primary_key=True)
    empresa_id = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    tipo_movimiento = Column(String(50)) # COMPRA, PRODUCCION, VENTA[cite: 22]
    cantidad = Column(Numeric(14, 2))
    costo_unitario = Column(Numeric(14, 2)) # Captura el valor al momento del movimiento[cite: 22]
    costo_total = Column(Numeric(14, 2))
    fecha_mov = Column(DateTime, server_default=func.now())
=======
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
>>>>>>> Back
