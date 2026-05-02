from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime, func
from app.db.session import Base

class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = {"schema": "inventario"}

    id = Column(Integer, primary_key=True, index=True)
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