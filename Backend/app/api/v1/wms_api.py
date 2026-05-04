from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.wms_schema import PickingCreate, ConfirmarItemPicking, PackingClose
from app.services import inventario_service

router = APIRouter()

@router.post("/picking/generar")
def generar_orden_picking(payload: PickingCreate, db: Session = Depends(get_db)):
    # Lógica: Validar pedido y asignar operario
    return {"status": "Picking Generado", "pedido": payload.pedido_id, "operario": payload.operario_id}

@router.post("/picking/confirmar-item")
async def confirmar_item_recolectado(payload: ConfirmarItemPicking, db: Session = Depends(get_db)):
    """
    Al confirmar un ítem en el móvil, el sistema reserva el stock físicamente[cite: 18].
    """
    try:
        # Llamada al core de inventario para bloquear la mercancía
        reserva = await inventario_service.gestionar_reserva(
            db=db,
            producto_id=payload.producto_id,
            bodega_id=payload.bodega_id,
            cantidad=payload.cantidad,
            accion='RESERVAR',
            empresa_id="EMPRESA_ACTUAL", # Reemplazar por dependencia de sesión
            lote_id=payload.lote_id
        )
        return {"status": "Item Reservado", "saldo_actual": reserva.cantidad_disponible}
    except HTTPException as e:
        raise e

@router.post("/packing/cerrar")
def finalizar_empaque(payload: PackingClose, db: Session = Depends(get_db)):
    # Lógica: Registrar empaque y cambiar estado del pedido a EMPACADO
    return {"status": "Packing Cerrado", "pedido_id": payload.pedido_id}