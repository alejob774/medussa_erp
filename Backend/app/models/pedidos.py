import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        UniqueConstraint("empresa_id", "local_uuid", name="uq_pedidos_empresa_local_uuid"),
        Index("ix_comercial_pedidos_empresa_estado", "empresa_id", "estado"),
        {"schema": "comercial"},
    )

    id = Column(String(36), primary_key=True, default=_uuid_str)
    local_uuid = Column(String(80), nullable=False, index=True)
    numero_pedido = Column(String(40), nullable=False, unique=True, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("configuracion.clientes.id"), nullable=False)
    vendedor_id = Column(Integer, nullable=True)
    conductor_id = Column(Integer, nullable=True)
    ruta_id = Column(Integer, nullable=True)
    vehiculo_id = Column(Integer, nullable=True)
    fecha_pedido = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_entrega_solicitada = Column(DateTime(timezone=True), nullable=True)
    fecha_entrega_real = Column(DateTime(timezone=True), nullable=True)
    tipo_pedido = Column(String(40), nullable=True)
    canal_venta = Column(String(40), nullable=True)
    prioridad = Column(String(20), nullable=True)
    condicion_pago = Column(String(80), nullable=True)
    estado = Column(String(40), nullable=False, default="CREADA")
    subtotal = Column(Numeric(14, 2), nullable=False, default=0)
    impuesto = Column(Numeric(14, 2), nullable=False, default=0)
    total = Column(Numeric(14, 2), nullable=False, default=0)
    reserva_inventario = Column(Boolean, nullable=False, default=False)
    synced = Column(Boolean, nullable=False, default=True)
    observaciones = Column(Text, nullable=True)
    rechazo_motivo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    detalles = relationship("PedidoDetalle", back_populates="pedido", cascade="all, delete-orphan")
    entregas = relationship("EntregaPedido", back_populates="pedido", cascade="all, delete-orphan")
    trazabilidad = relationship("TrazabilidadPedido", back_populates="pedido", cascade="all, delete-orphan")

    @property
    def uuid_movil(self) -> str:
        return self.local_uuid

    @uuid_movil.setter
    def uuid_movil(self, value: str) -> None:
        self.local_uuid = value


class PedidoDetalle(Base):
    __tablename__ = "pedido_detalle"
    __table_args__ = (
        Index("ix_comercial_pedido_detalle_pedido_id", "pedido_id"),
        {"schema": "comercial"},
    )

    id = Column(String(36), primary_key=True, default=_uuid_str)
    pedido_id = Column(String(36), ForeignKey("comercial.pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, nullable=False)
    bodega_id = Column(Integer, nullable=True)
    sku = Column(String(80), nullable=True)
    producto_nombre = Column(String(180), nullable=True)
    presentacion = Column(String(80), nullable=True)
    unidad = Column(String(30), nullable=True)
    cantidad = Column(Numeric(14, 4), nullable=False)
    cantidad_reservada = Column(Numeric(14, 4), nullable=False, default=0)
    cantidad_entregada = Column(Numeric(14, 4), nullable=False, default=0)
    precio_unitario = Column(Numeric(14, 2), nullable=False, default=0)
    total_linea = Column(Numeric(14, 2), nullable=False, default=0)
    stock_disponible = Column(Numeric(14, 4), nullable=True)
    entrega_posterior = Column(Boolean, nullable=False, default=False)

    pedido = relationship("Pedido", back_populates="detalles")
    entregas_detalle = relationship("EntregaPedidoDetalle", back_populates="pedido_detalle")


class PedidoConsolidado(Base):
    __tablename__ = "pedidos_consolidado"
    __table_args__ = {"schema": "comercial"}

    id = Column(String(36), primary_key=True, default=_uuid_str)
    empresa_id = Column(String(50), nullable=False, index=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    vendedor_id = Column(Integer, nullable=True)
    ruta_id = Column(Integer, nullable=True)
    total_pedidos = Column(Integer, nullable=False, default=0)
    total_unidades = Column(Numeric(14, 4), nullable=False, default=0)
    total_valor = Column(Numeric(14, 2), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    detalles = relationship("PedidoConsolidadoDetalle", back_populates="consolidado", cascade="all, delete-orphan")


class PedidoConsolidadoDetalle(Base):
    __tablename__ = "pedidos_consolidado_detalle"
    __table_args__ = {"schema": "comercial"}

    id = Column(String(36), primary_key=True, default=_uuid_str)
    consolidado_id = Column(
        String(36),
        ForeignKey("comercial.pedidos_consolidado.id", ondelete="CASCADE"),
        nullable=False,
    )
    producto_id = Column(Integer, nullable=False)
    sku = Column(String(80), nullable=True)
    producto_nombre = Column(String(180), nullable=True)
    cantidad_total = Column(Numeric(14, 4), nullable=False, default=0)
    valor_total = Column(Numeric(14, 2), nullable=False, default=0)

    consolidado = relationship("PedidoConsolidado", back_populates="detalles")


class EntregaPedido(Base):
    __tablename__ = "entregas_pedido"
    __table_args__ = {"schema": "comercial"}

    id = Column(String(36), primary_key=True, default=_uuid_str)
    pedido_id = Column(String(36), ForeignKey("comercial.pedidos.id", ondelete="CASCADE"), nullable=False)
    empresa_id = Column(String(50), nullable=False, index=True)
    conductor_id = Column(Integer, nullable=True)
    ruta_id = Column(Integer, nullable=True)
    vehiculo_id = Column(Integer, nullable=True)
    usuario_entrega_id = Column(Integer, nullable=True)
    fecha_entrega = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    firma_cliente = Column(Text, nullable=False)
    foto_entrega = Column(Text, nullable=True)
    gps_latitud = Column(Numeric(10, 7), nullable=True)
    gps_longitud = Column(Numeric(10, 7), nullable=True)
    comentarios = Column(Text, nullable=True)
    estado = Column(String(40), nullable=False, default="REGISTRADA")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    pedido = relationship("Pedido", back_populates="entregas")
    detalles = relationship("EntregaPedidoDetalle", back_populates="entrega", cascade="all, delete-orphan")


class EntregaPedidoDetalle(Base):
    __tablename__ = "entregas_pedido_detalle"
    __table_args__ = {"schema": "comercial"}

    id = Column(String(36), primary_key=True, default=_uuid_str)
    entrega_id = Column(String(36), ForeignKey("comercial.entregas_pedido.id", ondelete="CASCADE"), nullable=False)
    pedido_detalle_id = Column(String(36), ForeignKey("comercial.pedido_detalle.id"), nullable=True)
    producto_id = Column(Integer, nullable=False)
    sku = Column(String(80), nullable=True)
    producto_nombre = Column(String(180), nullable=True)
    cantidad_entregada = Column(Numeric(14, 4), nullable=False)
    unidad = Column(String(30), nullable=True)

    entrega = relationship("EntregaPedido", back_populates="detalles")
    pedido_detalle = relationship("PedidoDetalle", back_populates="entregas_detalle")


class TrazabilidadPedido(Base):
    __tablename__ = "trazabilidad_pedidos"
    __table_args__ = {"schema": "comercial"}

    id = Column(String(36), primary_key=True, default=_uuid_str)
    pedido_id = Column(String(36), ForeignKey("comercial.pedidos.id", ondelete="CASCADE"), nullable=False)
    empresa_id = Column(String(50), nullable=False, index=True)
    estado_anterior = Column(String(40), nullable=True)
    estado_nuevo = Column(String(40), nullable=False)
    usuario_id = Column(Integer, nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    observaciones = Column(Text, nullable=True)

    pedido = relationship("Pedido", back_populates="trazabilidad")
