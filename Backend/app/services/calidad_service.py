from sqlalchemy.orm import Session
from app.models.calidad import CalidadInspeccion, CalidadInspeccionDetalle
from app.schemas.calidad import InspeccionCreate
from app.schemas.inventario import MovimientoCreate
from app.services.inventario_service import registrar_movimiento

async def registrar_inspeccion(db: Session, data: InspeccionCreate, empresa_id: str):
    nueva_inspeccion = CalidadInspeccion(
        empresa_id=empresa_id,
        tipo_control=data.tipo_control,
        lote_id=data.lote,
        producto_id=data.producto_id,
        cantidad_muestra=data.cantidad_lote, # Mapeo de cantidad
        analista=data.analista,
        equipo_utilizado=data.equipo_utilizado,
        observaciones=data.observaciones
    )
    db.add(nueva_inspeccion)
    db.flush()

    lote_aprobado = True
    for p in data.parametros:
        es_conforme = p.min_esperado <= p.resultado <= p.max_esperado
        if not es_conforme:
            lote_aprobado = False
        
        detalle = CalidadInspeccionDetalle(
            inspeccion_id=nueva_inspeccion.id,
            parametro=p.parametro,
            resultado=p.resultado,
            min_esperado=p.min_esperado,
            max_esperado=p.max_esperado,
            conforme=es_conforme
        )
        db.add(detalle)

    nueva_inspeccion.resultado_final = "APROBADO" if lote_aprobado else "RECHAZADO"
    nueva_inspeccion.liberado = lote_aprobado

    # INTEGRACIÓN INVENTORY CORE
    if not lote_aprobado:
        mov = MovimientoCreate(
            producto_id=data.producto_id,
            bodega_id=data.bodega_id,
            cantidad=data.cantidad_lote,
            tipo_movimiento="BLOQUEO_CALIDAD", # Movimiento técnico
            lote_id=data.lote,
            documento_referencia=f"INSP-{nueva_inspeccion.id}",
            observaciones="Bloqueo automático por inspección fallida"
        )
        await registrar_movimiento(db, mov, empresa_id)

    db.commit()
    db.refresh(nueva_inspeccion)
    return nueva_inspeccion