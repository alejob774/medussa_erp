from sqlalchemy.orm import Session
from app.models.oee import OEE_Registro

def calcular_y_guardar_oee(db: Session, data: dict):
    # Fórmulas OEE
    t_operativo = data['tiempo_programado_min'] - data['tiempo_parado_min']
    
    disp = (t_operativo / data['tiempo_programado_min']) if data['tiempo_programado_min'] > 0 else 0
    rend = (data['unidades_producidas'] / data['unidades_objetivo']) if data['unidades_objetivo'] > 0 else 0
    cal = ((data['unidades_producidas'] - data['unidades_rechazadas']) / data['unidades_producidas']) if data['unidades_producidas'] > 0 else 0
    
    oee_final = disp * rend * cal * 100

    nuevo_registro = OEE_Registro(
        empresa_id=data['empresa_id'],
        equipo_id=data['equipo_id'],
        fecha=data['fecha'],
        turno=data['turno'],
        tiempo_programado=data['tiempo_programado_min'],
        tiempo_parado=data['tiempo_parado_min'],
        unidades_producidas=data['unidades_producidas'],
        unidades_objetivo=data['unidades_objetivo'],
        unidades_rechazadas=data['unidades_rechazadas'],
        disponibilidad=round(disp * 100, 2),
        rendimiento=round(rend * 100, 2),
        calidad=round(cal * 100, 2),
        oee_total=round(oee_final, 2)
    )

    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro