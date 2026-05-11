from sqlalchemy.orm import Session
from app.models.tpm import TPMOrdenTrabajo # Corrección de naming del modelo
from app.schemas.tpm import OTUpdate
from app.schemas.inventario import MovimientoCreate
from app.services.inventario_service import registrar_movimiento
from datetime import datetime

async def cerrar_ot(db: Session, ot_id: int, data: OTUpdate, empresa_id: str):
    ot = db.query(TPMOrdenTrabajo).filter(TpmOrdenTrabajo.id == ot_id, TpmOrdenTrabajo.empresa_id == empresa_id).first()
    if ot:
        ot.estado = "CERRADA"
        ot.fecha_cierre = datetime.now()
        ot.tiempo_reparacion = data.tiempo_reparacion
        ot.costo_estimado = data.costo_estimado
        
        # INTEGRACIÓN INVENTORY CORE
        if data.repuestos:
            for rep in data.repuestos:
                mov = MovimientoCreate(
                    producto_id=rep.producto_id,
                    bodega_id=rep.bodega_id,
                    cantidad=rep.cantidad,
                    tipo_movimiento="CONSUMO_TPM", # Movimiento económico
                    documento_referencia=f"OT-{ot_id}",
                    observaciones="Consumo por mantenimiento"
                )
                await registrar_movimiento(db, mov, empresa_id)
                
        db.commit()
    return ot

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
