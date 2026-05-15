from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.pedidos import (
    EntregaPedido,
    EntregaPedidoDetalle,
    Pedido,
    PedidoDetalle,
    TrazabilidadPedido,
)
from app.schemas.inventario import MovimientoCreate
from app.schemas.pedidos import EntregaPedidoCreate
from app.services import inventario_service


ESTADOS_ENTREGABLES = {"EN_RUTA", "LISTA_PARA_DESPACHO"}


def _dec(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _get_pedido(db: Session, pedido_id: str, empresa_id: str) -> Pedido:
    pedido = db.query(Pedido).options(selectinload(Pedido.detalles)).filter(
        Pedido.id == pedido_id,
        Pedido.empresa_id == empresa_id,
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Orden no encontrada para la empresa activa")
    return pedido


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


def listar_ordenes_en_ruta(db: Session, empresa_id: str) -> list[Pedido]:
    return db.query(Pedido).options(selectinload(Pedido.detalles)).filter(
        Pedido.empresa_id == empresa_id,
        Pedido.estado.in_(ESTADOS_ENTREGABLES),
    ).order_by(Pedido.fecha_entrega_solicitada.asc().nullslast(), Pedido.created_at.desc()).all()


def obtener_orden(db: Session, pedido_id: str, empresa_id: str) -> Pedido:
    return _get_pedido(db, pedido_id, empresa_id)


def obtener_trazabilidad(db: Session, pedido_id: str, empresa_id: str):
    _get_pedido(db, pedido_id, empresa_id)
    return db.query(TrazabilidadPedido).filter(
        TrazabilidadPedido.pedido_id == pedido_id,
        TrazabilidadPedido.empresa_id == empresa_id,
    ).order_by(TrazabilidadPedido.fecha.asc()).all()


def _buscar_detalle(pedido: Pedido, pedido_detalle_id: Optional[str], producto_id: int) -> PedidoDetalle:
    for detalle in pedido.detalles:
        if pedido_detalle_id and detalle.id == pedido_detalle_id:
            return detalle
    for detalle in pedido.detalles:
        if detalle.producto_id == producto_id:
            return detalle
    raise HTTPException(status_code=404, detail=f"Producto {producto_id} no pertenece a la orden")


async def _registrar_despacho_inventory_core(
    db: Session,
    detalle: PedidoDetalle,
    cantidad: Decimal,
    empresa_id: str,
    numero_pedido: str,
) -> None:
    if not detalle.bodega_id:
        return

    if _dec(detalle.cantidad_reservada) > 0:
        liberar = min(_dec(detalle.cantidad_reservada), cantidad)
        if liberar > 0:
            await inventario_service.registrar_movimiento(
                db,
                MovimientoCreate(
                    producto_id=detalle.producto_id,
                    bodega_id=detalle.bodega_id,
                    cantidad=-float(liberar),
                    tipo_movimiento="LIBERACION",
                    documento_referencia=numero_pedido,
                ),
                empresa_id,
            )
            detalle.cantidad_reservada = max(Decimal("0"), _dec(detalle.cantidad_reservada) - liberar)

    await inventario_service.registrar_movimiento(
        db,
        MovimientoCreate(
            producto_id=detalle.producto_id,
            bodega_id=detalle.bodega_id,
            cantidad=-float(cantidad),
            tipo_movimiento="DESPACHO_CLIENTE",
            documento_referencia=numero_pedido,
        ),
        empresa_id,
    )


async def registrar_entrega(
    db: Session,
    payload: EntregaPedidoCreate,
    empresa_id: str,
    usuario_id: Optional[int] = None,
):
    pedido = _get_pedido(db, payload.pedido_id, empresa_id)
    if pedido.estado not in ESTADOS_ENTREGABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede entregar una orden EN_RUTA o LISTA_PARA_DESPACHO",
        )
    if not payload.firma_cliente or not payload.firma_cliente.strip():
        raise HTTPException(status_code=400, detail="La firma del cliente es obligatoria para cerrar la entrega")
    if not payload.productos_entregados:
        raise HTTPException(status_code=400, detail="Debe informar al menos un producto entregado")

    entrega = EntregaPedido(
        pedido_id=pedido.id,
        empresa_id=empresa_id,
        conductor_id=payload.conductor_id or pedido.conductor_id,
        ruta_id=payload.ruta_id or pedido.ruta_id,
        vehiculo_id=payload.vehiculo_id or pedido.vehiculo_id,
        usuario_entrega_id=usuario_id,
        fecha_entrega=payload.fecha_entrega or datetime.now(timezone.utc),
        firma_cliente=payload.firma_cliente,
        foto_entrega=payload.foto_entrega,
        gps_latitud=payload.gps_latitud,
        gps_longitud=payload.gps_longitud,
        comentarios=payload.comentarios,
        estado="REGISTRADA",
    )
    db.add(entrega)
    db.flush()

    for item in payload.productos_entregados:
        cantidad = _dec(item.cantidad_entregada)
        if cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad entregada debe ser mayor a cero")
        detalle = _buscar_detalle(pedido, item.pedido_detalle_id, item.producto_id)
        pendiente = _dec(detalle.cantidad) - _dec(detalle.cantidad_entregada)
        if cantidad > pendiente:
            raise HTTPException(status_code=400, detail="La cantidad entregada no puede superar la pendiente")

        detalle.cantidad_entregada = _dec(detalle.cantidad_entregada) + cantidad
        entrega.detalles.append(
            EntregaPedidoDetalle(
                pedido_detalle_id=detalle.id,
                producto_id=detalle.producto_id,
                sku=item.sku or detalle.sku,
                producto_nombre=item.producto_nombre or detalle.producto_nombre,
                cantidad_entregada=cantidad,
                unidad=item.unidad or detalle.unidad,
            )
        )
        await _registrar_despacho_inventory_core(db, detalle, cantidad, empresa_id, pedido.numero_pedido)

    total_pendiente = sum(
        (_dec(detalle.cantidad) - _dec(detalle.cantidad_entregada) for detalle in pedido.detalles),
        Decimal("0"),
    )
    estado_anterior = pedido.estado
    pedido.estado = "ENTREGADA" if total_pendiente <= 0 else "PARCIALMENTE_SURTIDA"
    if pedido.estado == "ENTREGADA":
        pedido.fecha_entrega_real = payload.fecha_entrega or datetime.now(timezone.utc)
    entrega.estado = pedido.estado

    _trazar(
        db,
        pedido.id,
        empresa_id,
        estado_anterior,
        pedido.estado,
        usuario_id,
        payload.comentarios or "Entrega registrada",
    )
    db.commit()
    db.refresh(entrega)
    return entrega
