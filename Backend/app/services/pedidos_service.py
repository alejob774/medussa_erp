from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.clientes import Cliente
from app.models.inventario import InventarioSaldo, Producto
from app.models.pedidos import (
    Pedido,
    PedidoConsolidado,
    PedidoConsolidadoDetalle,
    PedidoDetalle,
    TrazabilidadPedido,
)
from app.schemas.inventario import MovimientoCreate
from app.schemas.pedidos import (
    PedidoConsolidadoCreate,
    PedidoCreate,
    ReservaInventarioRequest,
)
from app.services import inventario_service


ESTADO_RECHAZADA = "RECHAZADA"
ESTADO_RECIBIDA = "RECIBIDA"


def _dec(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _validar_empresa_payload(payload_empresa_id: Optional[str], empresa_id: str) -> None:
    if payload_empresa_id and str(payload_empresa_id) != str(empresa_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="empresa_id del payload no coincide con X-Company-ID",
        )


def _cliente_restringido(cliente: Cliente) -> tuple[bool, Optional[str]]:
    if not cliente:
        return True, "Cliente no encontrado"
    if getattr(cliente, "estado", True) is False:
        return True, "Cliente inactivo o restringido comercialmente"
    for attr in ("restriccion_comercial", "bloqueado", "bloqueado_comercial"):
        if getattr(cliente, attr, False):
            return True, "Cliente con restriccion comercial"
    estado_credito = str(getattr(cliente, "estado_credito", "") or "").upper()
    if estado_credito in {"BLOQUEADO", "RESTRINGIDO", "SUSPENDIDO"}:
        return True, f"Cliente con estado de credito {estado_credito}"
    return False, None


def _generar_numero_pedido(db: Session, empresa_id: str) -> str:
    hoy = datetime.now(timezone.utc).strftime("%Y%m%d")
    total_dia = db.query(func.count(Pedido.id)).filter(
        Pedido.empresa_id == empresa_id,
        func.to_char(Pedido.created_at, "YYYYMMDD") == hoy,
    ).scalar() or 0
    return f"PED-{hoy}-{int(total_dia) + 1:06d}"


def _trazar(
    db: Session,
    pedido_id: str,
    empresa_id: str,
    estado_anterior: Optional[str],
    estado_nuevo: str,
    usuario_id: Optional[int],
    observaciones: Optional[str] = None,
) -> None:
    db.add(
        TrazabilidadPedido(
            pedido_id=pedido_id,
            empresa_id=empresa_id,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            usuario_id=usuario_id,
            observaciones=observaciones,
        )
    )


def _buscar_cliente(db: Session, cliente_id: int, empresa_id: str) -> Cliente:
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == empresa_id,
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado para la empresa activa")
    return cliente


def _buscar_producto(db: Session, producto_id: int, empresa_id: str) -> Producto:
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.empresa_id == empresa_id,
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado para la empresa activa")
    return producto


def _saldo_disponible(
    db: Session,
    producto_id: int,
    empresa_id: str,
    bodega_id: Optional[int] = None,
) -> tuple[Decimal, Optional[int], Decimal, Decimal]:
    query = db.query(InventarioSaldo).filter(
        InventarioSaldo.producto_id == producto_id,
        InventarioSaldo.empresa_id == empresa_id,
    )
    if bodega_id is not None:
        query = query.filter(InventarioSaldo.bodega_id == bodega_id)
    saldos = query.all()
    if not saldos:
        return Decimal("0"), bodega_id, Decimal("0"), Decimal("0")

    if bodega_id is not None:
        saldo = saldos[0]
        fisica = _dec(saldo.cantidad_fisica)
        reservada = _dec(saldo.cantidad_reservada)
        return fisica - reservada, saldo.bodega_id, fisica, reservada

    elegido = max(saldos, key=lambda item: _dec(item.cantidad_fisica) - _dec(item.cantidad_reservada))
    fisica_total = sum((_dec(s.cantidad_fisica) for s in saldos), Decimal("0"))
    reservada_total = sum((_dec(s.cantidad_reservada) for s in saldos), Decimal("0"))
    return fisica_total - reservada_total, elegido.bodega_id, fisica_total, reservada_total


async def _reservar_linea_si_posible(
    db: Session,
    detalle: PedidoDetalle,
    empresa_id: str,
    numero_pedido: str,
) -> Decimal:
    disponible, bodega_id, _, _ = _saldo_disponible(db, detalle.producto_id, empresa_id, detalle.bodega_id)
    detalle.stock_disponible = disponible
    if disponible < _dec(detalle.cantidad) or not bodega_id:
        detalle.entrega_posterior = True
        return Decimal("0")

    mov = MovimientoCreate(
        producto_id=detalle.producto_id,
        bodega_id=bodega_id,
        cantidad=float(detalle.cantidad),
        tipo_movimiento="RESERVA",
        documento_referencia=numero_pedido,
    )
    await inventario_service.registrar_movimiento(db, mov, empresa_id)
    detalle.bodega_id = bodega_id
    detalle.cantidad_reservada = detalle.cantidad
    detalle.entrega_posterior = False
    return _dec(detalle.cantidad)


def listar_pedidos(
    db: Session,
    empresa_id: str,
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Pedido]:
    query = db.query(Pedido).options(selectinload(Pedido.detalles)).filter(Pedido.empresa_id == empresa_id)
    if estado:
        query = query.filter(Pedido.estado == estado.upper())
    if cliente_id:
        query = query.filter(Pedido.cliente_id == cliente_id)
    return query.order_by(Pedido.created_at.desc()).offset(skip).limit(limit).all()


def obtener_pedido(db: Session, pedido_id: str, empresa_id: str) -> Pedido:
    pedido = db.query(Pedido).options(selectinload(Pedido.detalles)).filter(
        Pedido.id == pedido_id,
        Pedido.empresa_id == empresa_id,
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado para la empresa activa")
    return pedido


async def crear_pedido(
    db: Session,
    payload: PedidoCreate,
    empresa_id: str,
    usuario_id: Optional[int] = None,
) -> Pedido:
    _validar_empresa_payload(payload.empresa_id, empresa_id)
    if not payload.detalles:
        raise HTTPException(status_code=400, detail="El pedido debe incluir al menos un producto")

    existente = db.query(Pedido).options(selectinload(Pedido.detalles)).filter(
        Pedido.local_uuid == payload.local_uuid,
        Pedido.empresa_id == empresa_id,
    ).first()
    if existente:
        return existente

    cliente = _buscar_cliente(db, payload.cliente_id, empresa_id)
    restringido, motivo_rechazo = _cliente_restringido(cliente)
    estado = ESTADO_RECHAZADA if restringido else ESTADO_RECIBIDA
    numero_pedido = _generar_numero_pedido(db, empresa_id)

    subtotal = Decimal("0")
    detalles_db: list[PedidoDetalle] = []
    for item in payload.detalles:
        if _dec(item.cantidad) <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero")
        producto = _buscar_producto(db, item.producto_id, empresa_id)
        precio = _dec(item.precio_unitario)
        cantidad = _dec(item.cantidad)
        total_linea = cantidad * precio
        subtotal += total_linea
        disponible, bodega_id, _, _ = _saldo_disponible(db, item.producto_id, empresa_id, item.bodega_id)
        detalles_db.append(
            PedidoDetalle(
                producto_id=item.producto_id,
                bodega_id=item.bodega_id or bodega_id,
                sku=item.sku or producto.producto_sku,
                producto_nombre=item.producto_nombre or producto.nombre,
                presentacion=item.presentacion,
                unidad=item.unidad or producto.uom_base,
                cantidad=cantidad,
                precio_unitario=precio,
                total_linea=total_linea,
                stock_disponible=disponible,
                entrega_posterior=item.entrega_posterior or disponible < cantidad,
            )
        )

    impuesto = _dec(payload.impuesto)
    pedido = Pedido(
        local_uuid=payload.local_uuid,
        numero_pedido=numero_pedido,
        empresa_id=empresa_id,
        cliente_id=payload.cliente_id,
        vendedor_id=payload.vendedor_id,
        conductor_id=payload.conductor_id,
        ruta_id=payload.ruta_id,
        vehiculo_id=payload.vehiculo_id,
        fecha_pedido=payload.fecha_pedido or datetime.now(timezone.utc),
        fecha_entrega_solicitada=payload.fecha_entrega_solicitada,
        tipo_pedido=payload.tipo_pedido,
        canal_venta=payload.canal_venta,
        prioridad=payload.prioridad,
        condicion_pago=payload.condicion_pago,
        estado=estado,
        subtotal=subtotal,
        impuesto=impuesto,
        total=subtotal + impuesto,
        synced=payload.synced,
        observaciones=payload.observaciones,
        rechazo_motivo=motivo_rechazo,
        detalles=detalles_db,
    )
    db.add(pedido)
    db.flush()
    _trazar(db, pedido.id, empresa_id, None, estado, usuario_id, motivo_rechazo or "Pedido recibido")

    if not restringido:
        reservadas = Decimal("0")
        for detalle in pedido.detalles:
            reservadas += await _reservar_linea_si_posible(db, detalle, empresa_id, numero_pedido)
        pedido.reserva_inventario = reservadas > 0

    db.commit()
    db.refresh(pedido)
    return obtener_pedido(db, pedido.id, empresa_id)


async def sincronizar_pedido_movil(db: Session, payload: PedidoCreate, empresa_id: str):
    return await crear_pedido(db, payload, empresa_id)


def disponibilidad(
    db: Session,
    empresa_id: str,
    producto_id: Optional[int] = None,
    sku: Optional[str] = None,
    bodega_id: Optional[int] = None,
):
    query = db.query(Producto).filter(Producto.empresa_id == empresa_id)
    if producto_id:
        query = query.filter(Producto.id == producto_id)
    if sku:
        query = query.filter(Producto.producto_sku == sku)

    productos = query.limit(100).all()
    if (producto_id or sku) and not productos:
        raise HTTPException(status_code=404, detail="Producto no encontrado para la empresa activa")

    respuesta = []
    for producto in productos:
        disponible, bodega_elegida, fisica, reservada = _saldo_disponible(db, producto.id, empresa_id, bodega_id)
        respuesta.append(
            {
                "producto_id": producto.id,
                "sku": producto.producto_sku,
                "producto_nombre": producto.nombre,
                "bodega_id": bodega_id or bodega_elegida,
                "cantidad_fisica": fisica,
                "cantidad_reservada": reservada,
                "cantidad_disponible": disponible,
                "entrega_posterior": disponible <= 0,
            }
        )
    return respuesta


async def reservar_inventario(
    db: Session,
    payload: ReservaInventarioRequest,
    empresa_id: str,
):
    items = []
    todo_reservado = True
    for item in payload.productos:
        disponible, bodega_id, _, _ = _saldo_disponible(db, item.producto_id, empresa_id, item.bodega_id)
        cantidad = _dec(item.cantidad)
        if disponible >= cantidad and bodega_id:
            mov = MovimientoCreate(
                producto_id=item.producto_id,
                bodega_id=bodega_id,
                cantidad=float(cantidad),
                tipo_movimiento="RESERVA",
                lote_id=item.lote_id,
                documento_referencia=payload.pedido_id or payload.local_uuid,
            )
            await inventario_service.registrar_movimiento(db, mov, empresa_id)
            reservada = cantidad
            estado = "RESERVADA"
            mensaje = None
        else:
            todo_reservado = False
            reservada = Decimal("0")
            estado = "PENDIENTE"
            mensaje = "Stock insuficiente o bodega no disponible; queda para entrega posterior"
        items.append(
            {
                "producto_id": item.producto_id,
                "bodega_id": bodega_id,
                "cantidad_solicitada": cantidad,
                "cantidad_reservada": reservada,
                "stock_disponible": disponible,
                "estado": estado,
                "mensaje": mensaje,
            }
        )
    return {
        "pedido_id": payload.pedido_id,
        "local_uuid": payload.local_uuid,
        "empresa_id": empresa_id,
        "reservada": todo_reservado,
        "items": items,
    }


def crear_consolidado(
    db: Session,
    payload: PedidoConsolidadoCreate,
    empresa_id: str,
) -> PedidoConsolidado:
    query = db.query(Pedido).options(selectinload(Pedido.detalles)).filter(
        Pedido.empresa_id == empresa_id,
        Pedido.estado != ESTADO_RECHAZADA,
    )
    if payload.pedido_ids:
        query = query.filter(Pedido.id.in_(payload.pedido_ids))
    if payload.vendedor_id:
        query = query.filter(Pedido.vendedor_id == payload.vendedor_id)
    if payload.ruta_id:
        query = query.filter(Pedido.ruta_id == payload.ruta_id)

    pedidos = query.all()
    acumulado = defaultdict(lambda: {"cantidad": Decimal("0"), "valor": Decimal("0"), "sku": None, "nombre": None})
    for pedido in pedidos:
        for detalle in pedido.detalles:
            bucket = acumulado[detalle.producto_id]
            bucket["cantidad"] += _dec(detalle.cantidad)
            bucket["valor"] += _dec(detalle.total_linea)
            bucket["sku"] = detalle.sku
            bucket["nombre"] = detalle.producto_nombre

    consolidado = PedidoConsolidado(
        empresa_id=empresa_id,
        fecha=payload.fecha or datetime.now(timezone.utc),
        vendedor_id=payload.vendedor_id,
        ruta_id=payload.ruta_id,
        total_pedidos=len(pedidos),
        total_unidades=sum((item["cantidad"] for item in acumulado.values()), Decimal("0")),
        total_valor=sum((item["valor"] for item in acumulado.values()), Decimal("0")),
    )
    for producto_id, item in acumulado.items():
        consolidado.detalles.append(
            PedidoConsolidadoDetalle(
                producto_id=producto_id,
                sku=item["sku"],
                producto_nombre=item["nombre"],
                cantidad_total=item["cantidad"],
                valor_total=item["valor"],
            )
        )
    db.add(consolidado)
    db.commit()
    db.refresh(consolidado)
    return consolidado
