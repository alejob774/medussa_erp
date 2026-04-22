from sqlalchemy.orm import Session
from app.models.tpm import TPMOrdenTrabajo, TPMPlan
from datetime import datetime

def crear_ot_correctiva(db: Session, data: dict, empresa_id: str):
    nueva_ot = TPMOrdenTrabajo(
        empresa_id=empresa_id,
        equipo_id=data['equipo_id'],
        tipo=data['tipo'],
        fecha_programada=datetime.now().date(),
        tecnico_asignado=data['tecnico'],
        observaciones=data.get('descripcion_falla'),
        estado="ABIERTA"
    )
    db.add(nueva_ot)
    db.commit()
    db.refresh(nueva_ot)
    return nueva_ot

def cerrar_ot(db: Session, ot_id: int, data: dict):
    ot = db.query(TPMOrdenTrabajo).filter(TPMOrdenTrabajo.id == ot_id).first()
    if ot:
        ot.estado = "CERRADA"
        ot.fecha_cierre = datetime.now()
        ot.tiempo_reparacion = data['tiempo_reparacion']
        ot.costo_estimado = data.get('costo', 0.0)
        db.commit()
    return ot