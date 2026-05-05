# app/api/v1/usuarios.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.session import get_db
from app.models.usuarios import Usuario
from app.models.seguridad import Rol, Perfil, UsuarioEmpresaRol
from app.models.configuracion import Configuracion
from app.schemas.usuarios import UsuarioCreate, UsuarioUpdate, UsuarioResponse, UsuarioDetalleResponse
from app.utils.auditoria import registrar_log
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    """Lista usuarios activos con sus membresías cargadas eficientemente."""
    return db.query(Usuario).options(
        joinedload(Usuario.membresias_rel)
    ).filter(Usuario.estado == True).all()

@router.get("/{id}", response_model=UsuarioDetalleResponse)
def obtener_usuario(id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de un usuario y sus empresas vinculadas."""
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Obtenemos las empresas vinculadas desde la tabla de seguridad
    empresas = db.query(UsuarioEmpresaRol).filter(UsuarioEmpresaRol.usuario_id == id).all()
    
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "username": usuario.username,
        "email": usuario.email,
        "cargo": usuario.cargo,
        "celular": usuario.celular,
        "telefono_fijo": usuario.telefono_fijo,
        "estado": usuario.estado,
        "empresas": empresas
    }

@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(request: Request, user_in: UsuarioCreate, db: Session = Depends(get_db)):
    """Crea un usuario y establece sus vínculos iniciales con empresas."""
    if db.query(Usuario).filter(Usuario.email == user_in.email).first():
        raise HTTPException(status_code=409, detail="Email ya registrado")

    try:
        nuevo_usuario = Usuario(
            nombre=user_in.nombre,
            apellido=user_in.apellido,
            username=user_in.username,
            email=user_in.email,
            cargo=user_in.cargo,
            celular=user_in.celular,
            telefono_fijo=user_in.telefono_fijo,
            password_hash=get_password_hash(user_in.password),
            estado=True
        )
        db.add(nuevo_usuario)
        db.flush() 

        # Procesar vínculos con empresas (HU-002)
        for emp in user_in.empresas:
            if not db.query(Configuracion).filter(Configuracion.empresa_id == emp.empresa_id).first():
                raise HTTPException(status_code=400, detail=f"Empresa {emp.empresa_id} no existe")
            
            vinculo = UsuarioEmpresaRol(
                usuario_id=nuevo_usuario.id,
                empresa_id=emp.empresa_id,
                rol_id=emp.rol_id,
                perfil_id=emp.perfil_id,
                estado="activo"
            )
            db.add(vinculo)

        db.commit()
        db.refresh(nuevo_usuario)
        await registrar_log(db, request, nuevo_usuario.id, nuevo_usuario.nombre, "ADMIN", "USUARIOS", "CREATE")
        return nuevo_usuario
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.put("/{id}", response_model=UsuarioResponse)
async def actualizar_usuario(id: int, user_in: UsuarioUpdate, request: Request, db: Session = Depends(get_db)):
    """Actualiza datos básicos del usuario."""
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(usuario, field, value)
    
    db.commit()
    db.refresh(usuario)
    await registrar_log(db, request, id, usuario.nombre, "ADMIN", "USUARIOS", "UPDATE")
    return usuario

@router.delete("/{id}")
async def eliminar_usuario(id: int, request: Request, db: Session = Depends(get_db)):
    """Realiza un borrado lógico (Soft Delete) del usuario."""
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.estado = False
    db.commit()
    await registrar_log(db, request, id, usuario.nombre, "ADMIN", "USUARIOS", "SOFT_DELETE")
    return {"message": "Usuario desactivado correctamente"}