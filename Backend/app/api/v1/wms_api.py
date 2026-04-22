from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.wms_schema import PickingCreate, ConfirmarItemPicking, PackingClose

router = APIRouter()

@router.post("/picking/generar")
def generar_orden_picking(payload: PickingCreate, db: Session = Depends(get_db)):
    # Lógica: Validar pedido y asignar operario
    return {"status": "Picking Generado", "pedido": payload.pedido_id, "operario": payload.operario_id}

@router.post("/picking/confirmar-item")
def confirmar_item_recolectado(payload: ConfirmarItemPicking, db: Session = Depends(get_db)):
    # Lógica: Validar contra stock y actualizar cantidad alistada
    return {"status": "Item Confirmado", "producto_id": payload.producto_id}

@router.post("/packing/cerrar")
def finalizar_empaque(payload: PackingClose, db: Session = Depends(get_db)):
    # Lógica: Registrar empaque y cambiar estado del pedido a EMPACADO
    return {"status": "Packing Cerrado", "pedido_id": payload.pedido_id}