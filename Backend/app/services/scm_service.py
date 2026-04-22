from sqlalchemy.orm import Session
from app.models.scm import Ubicacion, UbicacionSKU
from sqlalchemy import func

def get_layout_bodega(db: Session, bodega_id: int):
    ubicaciones = db.query(Ubicacion).filter(Ubicacion.bodega_id == bodega_id).all()
    for u in ubicaciones:
        # Lógica de cálculo de ocupación estratégica
        u.ocupacion_pct = (u.capacidad_ocupada / u.capacidad_maxima * 100) if u.capacidad_maxima > 0 else 0
    return ubicaciones

def asignar_sku_posicion(db: Session, ubicacion_id: int, producto_id: int, prioridad: int = 1):
    nueva_asignacion = UbicacionSKU(
        ubicacion_id=ubicacion_id,
        producto_id=producto_id,
        prioridad=prioridad
    )
    db.add(nueva_asignacion)
    db.commit()
    return nueva_asignacion

def obtener_alertas_capacidad(db: Session, limite: float = 90.0):
    # Retorna ubicaciones con ocupación superior al límite (Ej: 90%)
    todas = db.query(Ubicacion).all()
    alertas = []
    for u in todas:
        pct = (u.capacidad_ocupada / u.capacidad_maxima * 100) if u.capacidad_maxima > 0 else 0
        if pct >= limite:
            alertas.append({"ubicacion": f"{u.zona}-{u.pasillo}-{u.rack}", "pct": pct})
    return alertas