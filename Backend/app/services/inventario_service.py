from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.inventario import Producto, InventarioSaldo, InventarioKardex
from app.schemas.producto import ProductoCreate, ProductoUpdate
from app.schemas.inventario import MovimientoCreate, TransferenciaCreate
from .costos_service import procesar_costo_movimiento

# --- GESTIÓN DE PRODUCTOS ---

async def obtener_producto_por_id(db: Session, producto_id: int, empresa_id: str):
    return db.query(Producto).filter(
        Producto.id == producto_id, 
        Producto.empresa_id == empresa_id
    ).first()

async def obtener_productos_paginados(db: Session, empresa_id: str, skip: int, limit: int, search: str = None):
    query = db.query(Producto).filter(Producto.empresa_id == empresa_id)
    if search:
        query = query.filter(
            or_(
                Producto.nombre.ilike(f"%{search}%"), 
                Producto.producto_sku.ilike(f"%{search}%")
            )
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return total, items

async def validar_sku_empresa(db: Session, sku: str, empresa_id: str) -> bool:
    resultado = db.query(Producto).filter(
        Producto.producto_sku == sku, 
        Producto.empresa_id == empresa_id
    ).first()
    return resultado is not None

async def crear_producto(db: Session, obj_in: ProductoCreate, empresa_id: str):
    datos = obj_in.model_dump()
    datos["empresa_id"] = empresa_id
    db_obj = Producto(**datos)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def actualizar_producto(db: Session, db_obj: Producto, obj_in: ProductoUpdate):
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_producto_logico(db: Session, db_obj: Producto):
    db_obj.estado = False
    db.commit()
    return db_obj

# --- MOVIMIENTOS Y KARDEX ---

async def registrar_movimiento(db: Session, mov_in: MovimientoCreate, empresa_id: str):
    # 1. Insertar siempre en Kardex como fuente única de verdad
    nuevo_kardex = InventarioKardex(**mov_in.model_dump(), empresa_id=empresa_id)
    db.add(nuevo_kardex)
    db.commit()
    
    # 2. Motor de recálculo
    return await recalcular_saldo_desde_kardex(db, mov_in.producto_id, mov_in.bodega_id, mov_in.lote_id, empresa_id)

async def recalcular_saldo_desde_kardex(db: Session, producto_id: int, bodega_id: int, lote_id: str, empresa_id: str):
    """Hace un SUM exacto de Kardex y hace UPSERT sobre InventarioSaldo"""
    # Suma transacciones físicas (+ Entradas, - Salidas)
    fisico = db.query(func.sum(InventarioKardex.cantidad)).filter(
        InventarioKardex.producto_id == producto_id,
        InventarioKardex.bodega_id == bodega_id,
        InventarioKardex.lote_id == lote_id,
        InventarioKardex.tipo_movimiento.in_(['ENTRADA', 'SALIDA', 'AJUSTE', 'RECHAZO', 'CONSUMO_TPM'])
    ).scalar() or 0.0

    # Suma Reservas/Bloqueos (Positivos) - Liberaciones (Negativas)
    reservado = db.query(func.sum(InventarioKardex.cantidad)).filter(
        InventarioKardex.producto_id == producto_id,
        InventarioKardex.bodega_id == bodega_id,
        InventarioKardex.lote_id == lote_id,
        InventarioKardex.tipo_movimiento.in_(['RESERVA', 'BLOQUEO', 'LIBERACION'])
    ).scalar() or 0.0

async def gestionar_reserva(db: Session, producto_id: int, bodega_id: int, cantidad: float, accion: str, empresa_id: str, lote_id: str = None):
    """Maneja el bloqueo y liberación de stock para picking y ventas."""
    saldo = db.query(InventarioSaldo).filter(
        InventarioSaldo.producto_id == producto_id,
        InventarioSaldo.bodega_id == bodega_id,
        InventarioSaldo.empresa_id == empresa_id,
        InventarioSaldo.lote_id == lote_id
    ).first()

    if not saldo:
        raise HTTPException(status_code=404, detail="No existe saldo para este producto/bodega")

    if accion == 'RESERVAR':
        if (saldo.cantidad_fisica - saldo.cantidad_reservada) < cantidad:
            raise HTTPException(status_code=400, detail="Stock disponible insuficiente")
        saldo.cantidad_reservada += cantidad
    elif accion == 'LIBERAR':
        saldo.cantidad_reservada = max(0, saldo.cantidad_reservada - cantidad)
    elif accion == 'EJECUTAR_SALIDA':
        saldo.cantidad_reservada = max(0, saldo.cantidad_reservada - cantidad)
        saldo.cantidad_fisica -= cantidad
    
    db.commit()
    db.refresh(saldo)
    return saldo

async def transferir_stock(db: Session, trans_in: TransferenciaCreate, empresa_id: str):
    """Ejecuta una salida de origen y entrada en destino en una sola transacción."""
    # 1. Salida de Origen
    mov_salida = MovimientoCreate(
        producto_id=trans_in.producto_id,
        bodega_id=trans_in.bodega_origen_id,
        cantidad=-trans_in.cantidad,
        tipo_movimiento="TRANSFERENCIA_SALIDA",
        lote_id=trans_in.lote_id,
        documento_referencia=trans_in.documento_referencia
    )
    await registrar_movimiento(db, mov_salida, empresa_id)

    # 2. Entrada en Destino
    mov_entrada = MovimientoCreate(
        producto_id=trans_in.producto_id,
        bodega_id=trans_in.bodega_destino_id,
        cantidad=trans_in.cantidad,
        tipo_movimiento="TRANSFERENCIA_ENTRADA",
        lote_id=trans_in.lote_id,
        documento_referencia=trans_in.documento_referencia
    )
    await registrar_movimiento(db, mov_entrada, empresa_id)
    return True