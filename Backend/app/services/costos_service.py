from sqlalchemy.orm import Session
from app.models.costos import CostoSku, CostoMovimiento
from app.models.inventario import InventarioSaldo

async def procesar_costo_movimiento(db: Session, kardex_id: int, producto_id: int, cantidad: float, costo_u: float, empresa_id: str):
    # 1. Registrar el movimiento de costo (Idempotencia con Kardex)[cite: 16, 17]
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

    # 2. Obtener saldo físico total (a través de todas las bodegas) para el CPP[cite: 12, 17]
    saldo_total = db.query(InventarioSaldo).filter_by(producto_id=producto_id, empresa_id=empresa_id).all()
    cantidad_total_antes = sum(s.cantidad_fisica for s in saldo_total) - cantidad

    # 3. Actualizar Maestro de Costos (CPP)[cite: 16, 17]
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
            nuevo_valor_total = valor_inventario_anterior + (cantidad * costo_u)
            nueva_cantidad_total = cantidad_total_antes + cantidad
            
            if nueva_cantidad_total > 0:
                costo_maestro.costo_promedio = nuevo_valor_total / nueva_cantidad_total
        
        costo_maestro.ultimo_costo = costo_u
    
    db.commit()
    return nuevo_costo_mov