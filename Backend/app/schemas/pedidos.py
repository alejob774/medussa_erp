from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PedidoDetalleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    producto_id: int = Field(validation_alias=AliasChoices("producto_id", "productoId"))
    bodega_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("bodega_id", "bodegaId"))
    sku: Optional[str] = None
    producto_nombre: Optional[str] = Field(default=None, validation_alias=AliasChoices("producto_nombre", "productoNombre"))
    presentacion: Optional[str] = None
    unidad: Optional[str] = None
    cantidad: Decimal
    precio_unitario: Decimal = Field(default=Decimal("0"), validation_alias=AliasChoices("precio_unitario", "precioUnitario"))
    entrega_posterior: bool = Field(default=False, validation_alias=AliasChoices("entrega_posterior", "entregaPosterior"))


class PedidoDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    producto_id: int
    bodega_id: Optional[int] = None
    sku: Optional[str] = None
    producto_nombre: Optional[str] = None
    presentacion: Optional[str] = None
    unidad: Optional[str] = None
    cantidad: Decimal
    cantidad_reservada: Decimal
    cantidad_entregada: Decimal
    precio_unitario: Decimal
    total_linea: Decimal
    stock_disponible: Optional[Decimal] = None
    entrega_posterior: bool


class PedidoCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    local_uuid: str = Field(validation_alias=AliasChoices("local_uuid", "localUuid", "uuid_movil", "uuidMovil"))
    empresa_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("empresa_id", "empresaId", "companyId"))
    cliente_id: int = Field(validation_alias=AliasChoices("cliente_id", "clienteId"))
    vendedor_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("vendedor_id", "vendedorId"))
    conductor_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("conductor_id", "conductorId"))
    ruta_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("ruta_id", "rutaId"))
    vehiculo_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("vehiculo_id", "vehiculoId"))
    fecha_pedido: Optional[datetime] = Field(default=None, validation_alias=AliasChoices("fecha_pedido", "fechaPedido"))
    fecha_entrega_solicitada: Optional[datetime] = Field(
        default=None,
        validation_alias=AliasChoices("fecha_entrega_solicitada", "fechaEntregaSolicitada", "fechaEntrega"),
    )
    tipo_pedido: Optional[str] = Field(default=None, validation_alias=AliasChoices("tipo_pedido", "tipoPedido"))
    canal_venta: Optional[str] = Field(default=None, validation_alias=AliasChoices("canal_venta", "canalVenta"))
    prioridad: Optional[str] = None
    condicion_pago: Optional[str] = Field(default=None, validation_alias=AliasChoices("condicion_pago", "condicionPago"))
    observaciones: Optional[str] = None
    impuesto: Decimal = Decimal("0")
    synced: bool = True
    detalles: List[PedidoDetalleCreate] = Field(default_factory=list, validation_alias=AliasChoices("detalles", "items", "productos"))


class PedidoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    local_uuid: str
    numero_pedido: str
    empresa_id: str
    cliente_id: int
    vendedor_id: Optional[int] = None
    conductor_id: Optional[int] = None
    ruta_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    fecha_pedido: datetime
    fecha_entrega_solicitada: Optional[datetime] = None
    fecha_entrega_real: Optional[datetime] = None
    tipo_pedido: Optional[str] = None
    canal_venta: Optional[str] = None
    prioridad: Optional[str] = None
    condicion_pago: Optional[str] = None
    estado: str
    subtotal: Decimal
    impuesto: Decimal
    total: Decimal
    reserva_inventario: bool
    synced: bool
    observaciones: Optional[str] = None
    rechazo_motivo: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    detalles: List[PedidoDetalleResponse] = Field(default_factory=list)


class PedidoConsolidadoCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    fecha: Optional[datetime] = None
    vendedor_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("vendedor_id", "vendedorId"))
    ruta_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("ruta_id", "rutaId"))
    pedido_ids: Optional[List[str]] = Field(default=None, validation_alias=AliasChoices("pedido_ids", "pedidoIds"))


class PedidoConsolidadoDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    producto_id: int
    sku: Optional[str] = None
    producto_nombre: Optional[str] = None
    cantidad_total: Decimal
    valor_total: Decimal


class PedidoConsolidadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    empresa_id: str
    fecha: datetime
    vendedor_id: Optional[int] = None
    ruta_id: Optional[int] = None
    total_pedidos: int
    total_unidades: Decimal
    total_valor: Decimal
    created_at: datetime
    detalles: List[PedidoConsolidadoDetalleResponse] = Field(default_factory=list)


class InventarioDisponibilidadResponse(BaseModel):
    producto_id: int
    sku: Optional[str] = None
    producto_nombre: Optional[str] = None
    bodega_id: Optional[int] = None
    cantidad_fisica: Decimal = Decimal("0")
    cantidad_reservada: Decimal = Decimal("0")
    cantidad_disponible: Decimal = Decimal("0")
    entrega_posterior: bool = False


class ReservaInventarioItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    producto_id: int = Field(validation_alias=AliasChoices("producto_id", "productoId"))
    bodega_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("bodega_id", "bodegaId"))
    cantidad: Decimal
    lote_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("lote_id", "loteId"))


class ReservaInventarioRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pedido_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("pedido_id", "pedidoId"))
    local_uuid: Optional[str] = Field(default=None, validation_alias=AliasChoices("local_uuid", "localUuid"))
    productos: List[ReservaInventarioItem] = Field(default_factory=list, validation_alias=AliasChoices("productos", "items", "detalles"))


class ReservaInventarioItemResponse(BaseModel):
    producto_id: int
    bodega_id: Optional[int] = None
    cantidad_solicitada: Decimal
    cantidad_reservada: Decimal
    stock_disponible: Decimal
    estado: str
    mensaje: Optional[str] = None


class ReservaInventarioResponse(BaseModel):
    pedido_id: Optional[str] = None
    local_uuid: Optional[str] = None
    empresa_id: str
    reservada: bool
    items: List[ReservaInventarioItemResponse]


class ClienteEstadoResponse(BaseModel):
    cliente_id: int
    empresa_id: str
    estado: str
    restringido: bool
    motivo: Optional[str] = None


class OrdenEnRutaResponse(PedidoResponse):
    pass


class EntregaDetalleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pedido_detalle_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("pedido_detalle_id", "pedidoDetalleId"))
    producto_id: int = Field(validation_alias=AliasChoices("producto_id", "productoId"))
    sku: Optional[str] = None
    producto_nombre: Optional[str] = Field(default=None, validation_alias=AliasChoices("producto_nombre", "productoNombre"))
    cantidad_entregada: Decimal = Field(validation_alias=AliasChoices("cantidad_entregada", "cantidadEntregada"))
    unidad: Optional[str] = None


class EntregaPedidoCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pedido_id: str = Field(validation_alias=AliasChoices("pedido_id", "pedidoId", "orden_id", "ordenId", "id"))
    conductor_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("conductor_id", "conductorId"))
    ruta_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("ruta_id", "rutaId"))
    vehiculo_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("vehiculo_id", "vehiculoId"))
    fecha_entrega: Optional[datetime] = Field(default=None, validation_alias=AliasChoices("fecha_entrega", "fechaEntrega"))
    firma_cliente: str = Field(validation_alias=AliasChoices("firma_cliente", "firmaCliente"))
    foto_entrega: Optional[str] = Field(default=None, validation_alias=AliasChoices("foto_entrega", "fotoEntrega"))
    gps_latitud: Optional[Decimal] = Field(default=None, validation_alias=AliasChoices("gps_latitud", "gpsLatitud", "latitud"))
    gps_longitud: Optional[Decimal] = Field(default=None, validation_alias=AliasChoices("gps_longitud", "gpsLongitud", "longitud"))
    comentarios: Optional[str] = None
    productos_entregados: List[EntregaDetalleCreate] = Field(
        default_factory=list,
        validation_alias=AliasChoices("productos_entregados", "productosEntregados", "detalles"),
    )


class EntregaDetalleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pedido_detalle_id: Optional[str] = None
    producto_id: int
    sku: Optional[str] = None
    producto_nombre: Optional[str] = None
    cantidad_entregada: Decimal
    unidad: Optional[str] = None


class EntregaPedidoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pedido_id: str
    empresa_id: str
    conductor_id: Optional[int] = None
    ruta_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    usuario_entrega_id: Optional[int] = None
    fecha_entrega: datetime
    firma_cliente: str
    foto_entrega: Optional[str] = None
    gps_latitud: Optional[Decimal] = None
    gps_longitud: Optional[Decimal] = None
    comentarios: Optional[str] = None
    estado: str
    created_at: datetime
    detalles: List[EntregaDetalleResponse] = Field(default_factory=list)


class TrazabilidadPedidoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pedido_id: str
    empresa_id: str
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    usuario_id: Optional[int] = None
    fecha: datetime
    observaciones: Optional[str] = None
