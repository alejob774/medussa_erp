from sqlalchemy.orm import Session
from app.models.mps import MPSPlan, MPSDetalle
from datetime import datetime

def generar_plan_maestro(db: Session, data: dict, empresa_id: str):
    # 1. Crear el encabezado del Plan
    nuevo_plan = MPSPlan(
        empresa_id=empresa_id,
        planta=data['planta'],
        fecha_inicio=datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date(),
        fecha_fin=datetime.strptime(data['fecha_fin'], '%Y-%m-%d').date(),
        usuario_crea="sistema_mps",
        estado="BORRADOR"
    )
    db.add(nuevo_plan)
    db.flush()

    # 2. Simulación de lógica de planeación (En producción consultaría Pedidos vs Stock)
    items_planeados = 0
    for item in data.get('items_base', []):
        detalle = MPSDetalle(
            plan_id=nuevo_plan.id,
            producto_id=item['producto_id'],
            fecha_produccion=nuevo_plan.fecha_inicio,
            cantidad_proponer=item['cantidad_sugerida'],
            prioridad=1,
            horas_estimadas=item['cantidad_sugerida'] / 100 # Ejemplo: 100 unidades por hora
        )
        db.add(detalle)
        items_planeados += 1

    db.commit()
    db.refresh(nuevo_plan)
    return nuevo_plan, items_planeados