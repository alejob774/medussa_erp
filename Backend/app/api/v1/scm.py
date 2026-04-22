from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import scm_service
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.get("/layout/{bodega_id}")
async def ver_layout(bodega_id: int, db: Session = Depends(get_db)):
    return scm_service.get_layout_bodega(db, bodega_id)

@router.get("/alertas")
async def consultar_alertas(db: Session = Depends(get_db)):
    return scm_service.obtener_alertas_capacidad(db)

@router.post("/asignar-estrategia")
async def asignar_posicion(request: Request, u_id: int, p_id: int, db: Session = Depends(get_db)):
    asignacion = scm_service.asignar_sku_posicion(db, u_id, p_id)
    await registrar_log(db, request, modulo="SCM", accion="ASIGNAR_UBICACION_ESTRATEGICA", objeto_id=asignacion.id)
    return {"status": "success", "detalle": "SKU asignado a posición estratégica"}