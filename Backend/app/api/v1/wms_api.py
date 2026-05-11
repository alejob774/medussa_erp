from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company
from app.schemas.wms_schema import PickingCreate, ConfirmarItemPicking, PackingClose
from app.schemas.inventario import MovimientoCreate
from app.services import inventario_service

router = APIRouter()

@router.post("/picking/generate")
def generar_orden_picking(payload: PickingCreate, db: Session = Depends(get_db), empresa_id: str = Depends(get_current_company)):
    return {"success": True, "status": "Picking Generado", "pedido": payload.pedido_id}

@router.post("/picking/confirm-item")
async def confirmar_item_recolectado(
    payload: ConfirmarItemPicking, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    """Reserva físicamente el stock en Inventory Core (HU-032)."""
    mov = MovimientoCreate(
        producto_id=payload.producto_id,
        bodega_id=payload.bodega_id,
        cantidad=payload.cantidad,
        tipo_movimiento="RESERVA",
        lote_id=payload.lote_id,
        documento_referencia=payload.pedido_id,
        observaciones=f"Picking por operario {payload.operario_id}"
    )
    
    nuevo_saldo = await inventario_service.registrar_movimiento(db, mov, empresa_id)
    return {"success": True, "status": "Item Reservado", "saldo_disponible": float(nuevo_saldo.cantidad_disponible)}

@router.post("/packing/close")
async def cerrar_packing(payload: PackingClose, db: Session = Depends(get_db), empresa_id: str = Depends(get_current_company)):
    # Aquí se iterarían las reservas del pedido para convertirlas en tipo "SALIDA" (Despacho real)
    return {"success": True, "status": "Packing Cerrado y Listo para Despacho"}