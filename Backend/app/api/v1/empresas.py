from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.services.empresa_service import listar_empresas_usuario

router = APIRouter()


@router.get("/mis-empresas")
async def mis_empresas(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return {
        "success": True,
        "data": listar_empresas_usuario(db, current_user)
    }
