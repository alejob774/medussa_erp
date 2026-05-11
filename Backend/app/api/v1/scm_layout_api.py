from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company
from app.schemas.scm_layout_schema import ZonaLayoutCreate, ReubicacionRequest, OcupacionResumen
from app.schemas.inventario import TransferenciaCreate
from app.services import inventario_service
from typing import List

router = APIRouter()

@router.post("/relocate")
async def ejecutar_reubicacion(
    payload: ReubicacionRequest, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    """Mueve stock entre ubicaciones/bodegas usando Inventory Core (HU-031)."""
    trans_in = TransferenciaCreate(
        producto_id=payload.producto_id,
        bodega_origen_id=payload.ubicacion_origen_id,
        bodega_destino_id=payload.ubicacion_destino_id,
        cantidad=payload.cantidad,
        lote_id=payload.lote_id,
        documento_referencia=f"REUBICACION-{payload.ubicacion_origen_id}-TO-{payload.ubicacion_destino_id}"
    )
    
    await inventario_service.transferir_stock(db, trans_in, empresa_id)
    return {"success": True, "mensaje": "Movimiento registrado y Kardex actualizado"}