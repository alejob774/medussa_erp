from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db
from app.schemas.pedidos import (
    PedidoConsolidadoCreate,
    PedidoConsolidadoResponse,
    PedidoCreate,
    PedidoResponse,
)
from app.services import pedidos_service

router = APIRouter()


@router.get("/", response_model=List[PedidoResponse])
def listar_pedidos(
    estado: Optional[str] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return pedidos_service.listar_pedidos(db, empresa_id, estado, cliente_id, skip, limit)


@router.post("/", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
async def crear_pedido(
    payload: PedidoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return await pedidos_service.crear_pedido(db, payload, empresa_id, current_user.id)


@router.post("/consolidado", response_model=PedidoConsolidadoResponse, status_code=status.HTTP_201_CREATED)
def crear_consolidado(
    payload: PedidoConsolidadoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return pedidos_service.crear_consolidado(db, payload, empresa_id)


@router.post("/sync")
async def sincronizar_pedido(
    payload: PedidoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    """Compatibilidad con el endpoint movil previo de HU-018."""
    pedido = await pedidos_service.sincronizar_pedido_movil(db, payload, empresa_id)
    return {
        "success": True,
        "uuid_movil": pedido.local_uuid,
        "local_uuid": pedido.local_uuid,
        "numero_pedido": pedido.numero_pedido,
        "estado": pedido.estado,
    }
