from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.models.configuracion import Configuracion
from app.models.seguridad import UsuarioEmpresaRol, Rol
from app.schemas.usuarios import UsuarioCreate, UsuarioUpdate, UsuarioResponse, UsuarioDetalleResponse
from app.utils.auditoria import registrar_log
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(request: Request, user_in: UsuarioCreate, db: Session = Depends(get_db)):
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

        for emp in user_in.empresas:
            # Validación de existencia
            if not db.query(Configuracion).filter(Configuracion.empresa_id == emp.empresa_id).first():
                raise HTTPException(status_code=400, detail=f"Empresa {emp.empresa_id} no existe")
            if not db.query(Rol).filter(Rol.id == emp.rol_id).first():
                raise HTTPException(status_code=400, detail=f"Rol ID {emp.rol_id} no existe")

            # Unificado a UsuarioEmpresaRol
            config = UsuarioEmpresaRol(
                usuario_id=nuevo_usuario.id,
                empresa_id=emp.empresa_id,
                rol_id=emp.rol_id,
                perfil_id=emp.perfil_id,
                estado="activo"
            )
            db.add(config)

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

@router.get("/{id}", response_model=UsuarioDetalleResponse)
def obtener_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Corregido: Ahora lee de la misma tabla donde se crea
    empresas = db.query(UsuarioEmpresaRol).filter(UsuarioEmpresaRol.usuario_id == id).all()
    
    return {
        **usuario.__dict__,
        "empresas": empresas
    }

### --- LISTAR (GET) ---
@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).filter(Usuario.estado == True).all()

### --- ELIMINAR (SOFT DELETE) ---
@router.delete("/{id}")
async def eliminar_usuario(id: int, request: Request, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.estado = False
    db.commit()
    
    await registrar_log(db, request, id, usuario.nombre, "ADMIN", "USUARIOS", "SOFT_DELETE")
    return {"message": "Usuario desactivado correctamente"}