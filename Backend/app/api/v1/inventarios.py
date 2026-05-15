from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db
from app.schemas.pedidos import (
    InventarioDisponibilidadResponse,
    ReservaInventarioRequest,
    ReservaInventarioResponse,
)
from app.services import pedidos_service

router = APIRouter()


@router.get("/disponibilidad", response_model=List[InventarioDisponibilidadResponse])
def consultar_disponibilidad(
    producto_id: Optional[int] = Query(default=None),
    sku: Optional[str] = Query(default=None),
    bodega_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return pedidos_service.disponibilidad(db, empresa_id, producto_id, sku, bodega_id)


@router.post("/reservas", response_model=ReservaInventarioResponse, status_code=status.HTTP_201_CREATED)
async def reservar_inventario(
    payload: ReservaInventarioRequest,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user=Depends(get_current_user),
):
    return await pedidos_service.reservar_inventario(db, payload, empresa_id)
