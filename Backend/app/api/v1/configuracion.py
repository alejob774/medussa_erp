from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.configuracion import Configuracion
from app.schemas.configuracion import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=EmpresaResponse, status_code=201)
async def crear_empresa(request: Request, emp_in: EmpresaCreate, db: Session = Depends(get_db)):
    # Validar duplicados [cite: 60, 61]
    if db.query(Configuracion).filter(Configuracion.nit == emp_in.nit).first():
        raise HTTPException(status_code=400, detail="El NIT ya existe para otra empresa")
    
    nueva_empresa = Configuracion(**emp_in.model_dump())
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    
    # Auditoría HU-012 [cite: 80]
    await registrar_log(db, request, 0, "SISTEMA", emp_in.empresa_id, "EMPRESAS", "CREATE", 
                        antes=None, despues=emp_in.model_dump())
    
    return nueva_empresa

@router.get("/", response_model=List[EmpresaResponse])
def listar_empresas(db: Session = Depends(get_db)):
    # El admin global puede ver todas, activas e inactivas [cite: 39]
    return db.query(Configuracion).all()

@router.put("/{id}", response_model=EmpresaResponse)
async def actualizar_empresa(id: int, request: Request, emp_in: EmpresaUpdate, db: Session = Depends(get_db)):
    empresa = db.query(Configuracion).filter(Configuracion.id == id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    antes = {c.name: getattr(empresa, c.name) for c in empresa.__table__.columns}
    
    for campo, valor in emp_in.model_dump(exclude_unset=True).items():
        setattr(empresa, campo, valor)
    
    db.commit()
    db.refresh(empresa)
    despues = {c.name: getattr(empresa, c.name) for c in empresa.__table__.columns}
    
    await registrar_log(db, request, 0, "ADMIN", empresa.empresa_id, "EMPRESAS", "UPDATE", 
                        antes=antes, despues=despues)
    return empresa

@router.delete("/{id}")
async def desactivar_empresa(id: int, request: Request, db: Session = Depends(get_db)):
    empresa = db.query(Configuracion).filter(Configuracion.id == id).first()
    # No permitir eliminación total 
    empresa.estado = False
    db.commit()
    
    await registrar_log(
        db, 
        request, 
        user_id=None, # Cambiamos 0 por None
        user_name="SISTEMA", 
        empresa_id=emp_in.empresa_id, 
        modulo="EMPRESAS", 
        accion="CREATE",
        antes=None, 
        despues=emp_in.model_dump()
    )
    return {"message": "Empresa desactivada correctamente"}