from sqlalchemy.orm import Session
from app.models.pedidos import Pedido, PedidoDetalle
from app.models.clientes import Cliente
from app.schemas.pedidos import PedidoCreate
from app.schemas.inventario import MovimientoCreate
from app.services import inventario_service

async def sincronizar_pedido_movil(db: Session, payload: PedidoCreate, empresa_id: str):
    # 1. Control de Idempotencia (Evitar doble procesamiento por reintentos de red)
    existente = db.query(Pedido).filter_by(uuid_movil=payload.uuid_movil, empresa_id=empresa_id).first()
    if existente:
        return existente

    # 2. Validación de Restricciones del Cliente
    cliente = db.query(Cliente).filter_by(id=payload.cliente_id).first()
    estado_pedido = "Creada"
    if not cliente or not getattr(cliente, 'estado', True):
        estado_pedido = "Rechazada" # Cliente bloqueado o inactivo

    # 3. Creación del Header del Pedido
    total = sum(d.cantidad * d.precio_unitario for d in payload.detalles)
    nuevo_pedido = Pedido(
        uuid_movil=payload.uuid_movil,
        empresa_id=empresa_id,
        cliente_id=payload.cliente_id,
        vendedor_id=payload.vendedor_id,
        estado=estado_pedido,
        total=total
    )
    db.add(nuevo_pedido)
    db.flush() # Obtener el ID sin comitear la transacción

    # Generación de correlativo
    nuevo_pedido.numero_pedido = f"PED-{nuevo_pedido.id:06d}"

    # 4. Procesamiento de Detalles e Integración con Inventory Core
    for det in payload.detalles:
        detalle_db = PedidoDetalle(
            pedido_id=nuevo_pedido.id,
            producto_id=det.producto_id,
            bodega_id=det.bodega_id,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario
        )
        db.add(detalle_db)

        # Si el pedido es válido, apartar el inventario inmediatamente
        if estado_pedido == "Creada":
            mov = MovimientoCreate(
                producto_id=det.producto_id,
                bodega_id=det.bodega_id,
                cantidad=det.cantidad,
                tipo_movimiento="RESERVA",
                documento_referencia=nuevo_pedido.numero_pedido,
                observaciones=f"Reserva por App Móvil - UUID: {payload.uuid_movil}"
            )
            await inventario_service.registrar_movimiento(db, mov, empresa_id)

    db.commit()
    db.refresh(nuevo_pedido)
    return nuevo_pedido