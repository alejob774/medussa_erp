from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company, get_current_user
from app.models.costos import CostoSku, CostoMovimiento
from app.models.inventario import Producto
from app.schemas.costos import CostoProductoResponse, MargenSKUResponse

router = APIRouter()

@router.get("/product-cost/{sku}", response_model=dict)
async def get_product_cost(
    sku: str, 
    db: Session = Depends(get_db), 
    empresa_id: str = Depends(get_current_company)
):
    producto = db.query(Producto).filter_by(producto_sku=sku, empresa_id=empresa_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    costo = db.query(CostoSku).filter_by(producto_id=producto.id, empresa_id=empresa_id).first()
    
    return {
        "success": True,
        "data": {
            "producto_id": producto.id,
            "sku": producto.producto_sku,
            "costo_actual": costo.costo_promedio if costo else 0.0,
            "metodo_costeo": producto.metodo_costo,
            "ultima_actualizacion": costo.ultima_actualizacion if costo else None
        }
    }

@router.get("/movements")
async def get_cost_movements(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db), 
    empresa_id: str = Depends(get_current_company)
):
    movimientos = db.query(CostoMovimiento).filter_by(empresa_id=empresa_id).offset(skip).limit(limit).all()
    total = db.query(CostoMovimiento).filter_by(empresa_id=empresa_id).count()
    return {"success": True, "data": movimientos, "total": total}

@router.post("/recalculate")
async def recalculate_costs(
    db: Session = Depends(get_db), 
    empresa_id: str = Depends(get_current_company)
):
    # Endpoint trigger para un job asíncrono en el futuro
    return {"success": True, "message": "Proceso de recálculo encolado"}

@router.get("/margin")
async def get_margins(
    db: Session = Depends(get_db), 
    empresa_id: str = Depends(get_current_company)
):
    # Lógica base de margen
    return {"success": True, "data": []}