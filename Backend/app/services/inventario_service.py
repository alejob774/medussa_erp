from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.inventario import Producto, InventarioSaldo, InventarioKardex
from app.schemas.producto import ProductoCreate, ProductoUpdate
from app.schemas.inventario import MovimientoCreate, TransferenciaCreate
from .costos_service import procesar_costo_movimiento

async def obtener_producto_por_id(db: Session, producto_id: int, empresa_id: str):
    return db.query(Producto).filter(
        Producto.id == producto_id, 
        Producto.empresa_id == empresa_id
    ).first()[cite: 14, 17]

async def actualizar_producto(db: Session, db_obj: Producto, obj_in: ProductoUpdate):
    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.commit()
    db.refresh(db_obj)
    return db_obj[cite: 17]

async def eliminar_producto_logico(db: Session, db_obj: Producto):
    db_obj.estado = False # Soft delete[cite: 13]
    db.commit()
    return db_obj

async def validar_sku_empresa(db: Session, sku: str, empresa_id: str) -> bool:
    """Verifica si un SKU ya existe dentro de una empresa específica."""
    resultado = db.query(Producto).filter(
        Producto.producto_sku == sku, 
        Producto.empresa_id == empresa_id
    ).first()
    return resultado is not None

async def crear_producto(db: Session, obj_in: ProductoCreate, empresa_id: str):
    """Persiste un nuevo producto asegurando el vínculo con la empresa."""
    datos = obj_in.model_dump()
    datos["empresa_id"] = empresa_id
    db_obj = Producto(**datos)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def obtener_productos_paginados(db: Session, empresa_id: str, skip: int, limit: int, search: str = None):
    query = db.query(Producto).filter(Producto.empresa_id == empresa_id)
    if search:
        query = query.filter(or_(Producto.nombre.ilike(f"%{search}%"), Producto.producto_sku.ilike(f"%{search}%")))
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return total, items

async def registrar_movimiento(db: Session, mov_in: MovimientoCreate, empresa_id: str, costo_unitario: float = 0.0):
    # ... (Lógica existente de creación de Kardex y Saldo)[cite: 18]
    nuevo_kardex = InventarioKardex(**mov_in.model_dump(), empresa_id=empresa_id)
    db.add(nuevo_kardex)
    db.flush() # Para obtener el ID del kardex sin hacer commit total[cite: 18]

    # Hook automático al Costs Core
    await procesar_costo_movimiento(
        db, 
        kardex_id=nuevo_kardex.id, 
        producto_id=mov_in.producto_id,
        cantidad=mov_in.cantidad,
        costo_u=costo_unitario,
        empresa_id=empresa_id
    )

    # ... (Resto de la lógica de saldos y commit final)[cite: 18]
    # 2. Buscar o Crear el registro de Saldo
    saldo = db.query(InventarioSaldo).filter(
        InventarioSaldo.producto_id == mov_in.producto_id,
        InventarioSaldo.bodega_id == mov_in.bodega_id,
        InventarioSaldo.lote_id == mov_in.lote_id,
        InventarioSaldo.empresa_id == empresa_id
    ).first()

    if not saldo:
        saldo = InventarioSaldo(
            producto_id=mov_in.producto_id,
            bodega_id=mov_in.bodega_id,
            lote_id=mov_in.lote_id,
            empresa_id=empresa_id,
            cantidad_fisica=0.0
        )
        db.add(saldo)

    # 3. Actualizar cantidad física
    saldo.cantidad_fisica += mov_in.cantidad
    
    db.commit()
    db.refresh(saldo)
    return saldo    

async def gestionar_reserva(db: Session, producto_id: int, bodega_id: int, cantidad: float, accion: str, empresa_id: str, lote_id: str = None):
    """
    Maneja el bloqueo y liberación de stock para Picking y Ventas.
    """
    saldo = db.query(InventarioSaldo).filter(
        InventarioSaldo.producto_id == producto_id,
        InventarioSaldo.bodega_id == bodega_id,
        InventarioSaldo.empresa_id == empresa_id,
        InventarioSaldo.lote_id == lote_id
    ).first()

    if not saldo:
        raise HTTPException(status_code=404, detail="No existe saldo para este producto/bodega")

    if accion == 'RESERVAR':
        if saldo.cantidad_disponible < cantidad:
            raise HTTPException(status_code=400, detail="Stock disponible insuficiente")
        saldo.cantidad_reservada += cantidad[cite: 15]
    elif accion == 'LIBERAR':
        saldo.cantidad_reservada = max(0, saldo.cantidad_reservada - cantidad)[cite: 15]
    elif accion == 'EJECUTAR_SALIDA':
        # Se asume que ya estaba reservado
        saldo.cantidad_reservada -= cantidad
        saldo.cantidad_fisica -= cantidad[cite: 15]
    
    db.commit()
    db.refresh(saldo)
    return saldo

async def transferir_stock(db: Session, trans_in: TransferenciaCreate, empresa_id: str):
    """
    Ejecuta una salida y una entrada en una sola transacción.
    """
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