from sqlalchemy.orm import Session
from app.models.costos import CostoSku, CostoMovimiento
from app.models.inventario import InventarioSaldo

MOVIMIENTOS_TECNICOS = [
    "BLOQUEO_CALIDAD", "LIBERACION_CALIDAD", "RECHAZO_CALIDAD",
    "RESERVA_STOCK", "LIBERACION_RESERVA", "TRANSFER_OUT", "TRANSFER_IN"
]

async def procesar_costo_movimiento(db: Session, kardex_id: int, producto_id: int, cantidad: float, costo_u: float, tipo_movimiento: str, empresa_id: str):
    # 1. Filtro de movimientos técnicos
    if tipo_movimiento in MOVIMIENTOS_TECNICOS:
        return {"status": "ignored", "reason": "technical_movement"}

    # 2. Control de Idempotencia
    existente = db.query(CostoMovimiento).filter_by(inventario_kardex_id=kardex_id).first()
    if existente:
        return {"status": "ignored", "reason": "already_processed"}

    # 3. Registrar el movimiento de costo
    nuevo_costo_mov = CostoMovimiento(
        inventario_kardex_id=kardex_id,
        producto_id=producto_id,
        cantidad=cantidad,
        costo_unitario=costo_u,
        costo_total=cantidad * costo_u,
        tipo_afectacion="DEBE" if cantidad > 0 else "HABER",
        empresa_id=empresa_id
    )
    db.add(nuevo_costo_mov)

    # 4. Obtener saldo físico total para el CPP
    saldo_total = db.query(InventarioSaldo).filter_by(producto_id=producto_id, empresa_id=empresa_id).all()
    cantidad_total_antes = sum(s.cantidad_fisica for s in saldo_total) - cantidad

    # 5. Actualizar Maestro de Costos (CPP)
    costo_maestro = db.query(CostoSku).filter_by(producto_id=producto_id, empresa_id=empresa_id).first()
    
    if not costo_maestro:
        costo_maestro = CostoSku(
            producto_id=producto_id, 
            empresa_id=empresa_id, 
            costo_promedio=costo_u, 
            ultimo_costo=costo_u
        )
        db.add(costo_maestro)
    else:
        if cantidad > 0: # Solo las entradas afectan el promedio ponderado
            valor_inventario_anterior = cantidad_total_antes * costo_maestro.costo_promedio
            valor_entrada = cantidad * costo_u
            nueva_cantidad_total = cantidad_total_antes + cantidad
            
            if nueva_cantidad_total > 0:
                nuevo_cpp = (valor_inventario_anterior + valor_entrada) / nueva_cantidad_total
                costo_maestro.costo_promedio = nuevo_cpp
                
        costo_maestro.ultimo_costo = costo_u

    db.commit()
    return {"status": "processed", "cpp_actual": costo_maestro.costo_promedio}