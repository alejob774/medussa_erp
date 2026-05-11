from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company, get_current_user
from app.schemas.pedidos import PedidoCreate
from app.services import pedidos_service

router = APIRouter()

@router.post("/sync")
async def sincronizar_pedido(
    payload: PedidoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Recibe pedidos desde la App Móvil con soporte offline (HU-018)"""
    pedido = await pedidos_service.sincronizar_pedido_movil(db, payload, empresa_id)
    return {
        "success": True,
        "uuid_movil": pedido.uuid_movil,
        "numero_pedido": pedido.numero_pedido,
        "estado": pedido.estado
    }