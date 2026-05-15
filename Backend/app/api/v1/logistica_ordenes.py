from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db
from app.schemas.pedidos import (
    EntregaPedidoCreate,
    EntregaPedidoResponse,
    OrdenEnRutaResponse,
    PedidoResponse,
    TrazabilidadPedidoResponse,
)
from app.services import entrega_service

router = APIRouter()


@router.get("/en-ruta", response_model=List[OrdenEnRutaResponse])
def listar_ordenes_en_ruta(
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return entrega_service.listar_ordenes_en_ruta(db, empresa_id)


@router.get("/{id}", response_model=PedidoResponse)
def obtener_orden(
    id: str,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return entrega_service.obtener_orden(db, id, empresa_id)


@router.post("/entregar", response_model=EntregaPedidoResponse, status_code=status.HTTP_201_CREATED)
async def registrar_entrega(
    payload: EntregaPedidoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return await entrega_service.registrar_entrega(db, payload, empresa_id, current_user.id)


@router.get("/{id}/trazabilidad", response_model=List[TrazabilidadPedidoResponse])
def consultar_trazabilidad(
    id: str,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return entrega_service.obtener_trazabilidad(db, id, empresa_id)
