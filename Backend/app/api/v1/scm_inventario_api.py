from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company
from app.schemas.scm_inventario_schema import ConteoCreate, RegistroFisico
from app.schemas.inventario import MovimientoCreate
from app.models.inventario import InventarioSaldo
from app.services import inventario_service

router = APIRouter()

@router.post("/cycle-counts/register-finding")
async def registrar_hallazgo(
    payload: RegistroFisico, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    """Ajusta diferencias de inventario detectadas en conteos físicos (HU-030)."""
    bodega_id = payload.ubicacion_id or 1 # Fallback seguro
    
    saldo_actual = db.query(InventarioSaldo).filter(
        InventarioSaldo.empresa_id == empresa_id,
        InventarioSaldo.producto_id == payload.producto_id,
        InventarioSaldo.bodega_id == bodega_id,
        InventarioSaldo.lote_id == payload.lote_id
    ).first()

    cantidad_sistema = float(saldo_actual.cantidad_fisica) if saldo_actual else 0.0
    diferencia = payload.cantidad_encontrada - cantidad_sistema

    if diferencia == 0:
        return {"success": True, "mensaje": "Cuadre exacto. No requiere ajuste."}

    tipo_ajuste = "AJUSTE_POS" if diferencia > 0 else "AJUSTE_NEG"
    
    mov = MovimientoCreate(
        producto_id=payload.producto_id,
        bodega_id=bodega_id,
        cantidad=abs(diferencia),
        tipo_movimiento=tipo_ajuste,
        lote_id=payload.lote_id,
        documento_referencia=f"CONTEO-{payload.conteo_id}",
        observaciones="Ajuste por conteo cíclico"
    )
    
    await inventario_service.registrar_movimiento(db, mov, empresa_id)
    return {
        "success": True, 
        "mensaje": f"Ajuste {tipo_ajuste} realizado por {abs(diferencia)} unidades",
        "diferencia": diferencia
    }