from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.configuracion import Configuracion
from app.schemas.configuracion import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.utils.auditoria import registrar_log
from app.api.deps import get_current_user  # <--- Agrega esta línea

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

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def desactivar_empresa(
    id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # Asumiendo que usas protección de rutas
):
    # 1. Validar existencia antes de cualquier operación
    empresa = db.query(Configuracion).filter(Configuracion.id == id).first()
    
    if not empresa:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró la empresa con ID {id}"
        )

    # 2. Capturar estado anterior para auditoría
    antes = {
        "id": empresa.id,
        "empresa_id": empresa.empresa_id,
        "nombre_empresa": empresa.nombre_empresa,
        "estado": empresa.estado
    }

    # 3. Ejecutar borrado lógico (Soft Delete)
    # Se corrige el error de variable 'emp_in' que no existía
    empresa.estado = False
    
    try:
        db.commit()
        db.refresh(empresa)
        
        # 4. Registro de auditoría corregido
        await registrar_log(
            db, 
            request, 
            user_id=current_user.id if current_user else 0, 
            user_name=current_user.username if current_user else "SISTEMA",
            empresa_id=empresa.empresa_id, 
            modulo="CONFIGURACION", 
            accion="DELETE_LOGICO",
            descripcion=f"Desactivación lógica de la empresa: {empresa.nombre_empresa}",
            payload_antes=antes,
            payload_despues={"id": empresa.id, "estado": empresa.estado}
        )

        return {
            "status": "success",
            "message": f"Empresa '{empresa.nombre_empresa}' desactivada correctamente.",
            "id": id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al procesar la solicitud: {str(e)}"
        )