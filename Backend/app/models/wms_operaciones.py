from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class PedidoCabecera(Base):
    __tablename__ = "wms_pedidos_cabecera"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    cliente_id = Column(Integer, ForeignKey("configuracion.clientes.id"))
    numero_pedido = Column(String(20), unique=True)
    fecha_pedido = Column(DateTime(timezone=True), server_default=func.now())
    estado = Column(String(20), default="PENDIENTE") # PENDIENTE, EN_PICKING, EMPACADO, DESPACHADO
    prioridad = Column(String(10), default="NORMAL") # ALTA, MEDIA, BAJA

    detalles = relationship("PedidoDetalle", back_populates="cabecera")

class PedidoDetalle(Base):
    __tablename__ = "wms_pedidos_detalle"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("scm.wms_pedidos_cabecera.id"))
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    cantidad_solicitada = Column(Numeric(10, 2))
    cantidad_alistada = Column(Numeric(10, 2), default=0)

    cabecera = relationship("PedidoCabecera", back_populates="detalles")

class PickingTarea(Base):
    __tablename__ = "wms_picking_tareas"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("scm.wms_pedidos_cabecera.id"))
    operario_id = Column(Integer, ForeignKey("configuracion.usuarios.id"))
    estado = Column(String(20), default="ASIGNADO") # ASIGNADO, EN_PROCESO, COMPLETADO
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)

class PackingRegistro(Base):
    __tablename__ = "wms_packing_registros"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("scm.wms_pedidos_cabecera.id"))
    tipo_empaque = Column(String(50)) # Caja, Pallet, Bolsa
    cantidad_unidades = Column(Integer)
    peso_total = Column(Numeric(10, 2))
    sello_seguridad = Column(String(50))
    usuario_empaque_id = Column(Integer, ForeignKey("configuracion.usuarios.id"))