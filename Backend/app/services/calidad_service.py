from sqlalchemy.orm import Session
from app.models.calidad import CalidadInspeccion, CalidadInspeccionDetalle

def registrar_inspeccion(db: Session, data: dict, empresa_id: str):
    # 1. Crear encabezado
    nueva_inspeccion = CalidadInspeccion(
        empresa_id=empresa_id,
        tipo_control=data['tipoControl'],
        lote=data['lote'],
        producto_id=data['producto_id'],
        fecha_muestra=data['fechaMuestra'],
        analista=data['analista'],
        equipo_utilizado=data.get('equipoUtilizado'),
        observaciones=data.get('observaciones')
    )
    db.add(nueva_inspeccion)
    db.flush()

    # 2. Procesar detalles y validar conformidad
    lote_aprobado = True
    for p in data['parametros']:
        es_conforme = p['min'] <= p['resultado'] <= p['max']
        if not es_conforme:
            lote_aprobado = False
        
        detalle = CalidadInspeccionDetalle(
            inspeccion_id=nueva_inspeccion.id,
            parametro=p['nombre'],
            resultado=p['resultado'],
            min_esperado=p['min'],
            max_esperado=p['max'],
            conforme=es_conforme
        )
        db.add(detalle)

    # 3. Determinar estado final
    nueva_inspeccion.estado_lote = "APROBADO" if lote_aprobado else "RECHAZADO"
    nueva_inspeccion.liberado = lote_aprobado
    
    db.commit()
    db.refresh(nueva_inspeccion)
    return nueva_inspeccion