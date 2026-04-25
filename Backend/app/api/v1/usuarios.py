from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.session import get_db
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.models.seguridad import Rol, Perfil
from app.models.configuracion import Configuracion
from app.schemas.usuarios import UsuarioCreate, UsuarioUpdate, UsuarioResponse, MembresiaOut, UsuarioDetalleResponse
from app.utils.auditoria import registrar_log
from app.core.security import get_password_hash

router = APIRouter()

### --- LISTAR (GET) ---
@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    # Optimización: joinedload carga las relaciones en una sola consulta SQL
    usuarios = db.query(Usuario).options(
        joinedload(Usuario.membresias_rel).joinedload(UsuarioEmpresaConfig.rol_rel),
        joinedload(Usuario.membresias_rel).joinedload(UsuarioEmpresaConfig.perfil_rel)
    ).filter(Usuario.estado == True).all()

    # Mapeo de nombres para el esquema de respuesta administrativa
    for u in usuarios:
        u.membresias = [
            MembresiaOut(
                empresa_id=m.empresa_id,
                rol_id=m.rol_id,
                rol_nombre=m.rol_rel.nombre if m.rol_rel else None,
                perfil_id=m.perfil_id,
                perfil_nombre=m.perfil_rel.nombre if m.perfil_rel else None
            ) for m in u.membresias_rel
        ]
    return usuarios

### --- DETALLE (GET BY ID) ---
@router.get("/{id}", response_model=UsuarioDetalleResponse)
def obtener_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).options(
        joinedload(Usuario.membresias_rel).joinedload(UsuarioEmpresaConfig.rol_rel),
        joinedload(Usuario.membresias_rel).joinedload(UsuarioEmpresaConfig.perfil_rel)
    ).filter(Usuario.id == id).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Mapeo explícito para asegurar compatibilidad con UsuarioDetalleResponse
    usuario.empresas = [
        {
            "empresa_id": m.empresa_id,
            "rol_id": m.rol_id,
            "perfil_id": m.perfil_id
        } for m in usuario.membresias_rel
    ]
    
    return usuario

### --- CREATE (POST) ---
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

        for emp in user_in.membresias:
            if not db.query(Configuracion).filter(Configuracion.empresa_id == emp.empresa_id).first():
                raise HTTPException(status_code=400, detail=f"Empresa {emp.empresa_id} no existe")
            
            if not db.query(Rol).filter(Rol.id == emp.rol_id).first():
                raise HTTPException(status_code=400, detail=f"Rol ID {emp.rol_id} no existe")

            config = UsuarioEmpresaConfig(
                usuario_id=nuevo_usuario.id,
                empresa_id=emp.empresa_id,
                rol_id=emp.rol_id,
                perfil_id=emp.perfil_id
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

### --- UPDATE (PUT) - HU-011 ---

@router.put("/{id}", response_model=UsuarioResponse)
async def editar_usuario(id: int, obj_in: UsuarioUpdate, request: Request, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).options(joinedload(Usuario.membresias_rel)).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = obj_in.model_dump(exclude_unset=True)
    
    # Lógica de Membresías (HU-011)
    if "membresias" in update_data:
        nuevas = update_data.pop("membresias")
        actuales = {m.empresa_id: m for m in usuario.membresias_rel}
        ids_nuevos = {m["empresa_id"] for m in nuevas}

        # 1. Eliminar las que ya no vienen
        for emp_id, obj_db in actuales.items():
            if emp_id not in ids_nuevos:
                db.delete(obj_db)

        # 2. Agregar o Actualizar
        for m_in in nuevas:
            emp_id = m_in["empresa_id"]
            if emp_id in actuales:
                actuales[emp_id].rol_id = m_in["rol_id"]
                actuales[emp_id].perfil_id = m_in.get("perfil_id")
            else:
                db.add(UsuarioEmpresaConfig(
                    usuario_id=id, empresa_id=emp_id, 
                    rol_id=m_in["rol_id"], perfil_id=m_in.get("perfil_id")
                ))

    # Actualizar datos básicos
    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return usuario

### --- ELIMINAR (SOFT DELETE) ---
@router.delete("/{id}")
async def eliminar_usuario(id: int, request: Request, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.estado = False # Soft Delete según requerimiento
    db.commit()
    
    await registrar_log(db, request, id, usuario.nombre, "ADMIN", "USUARIOS", "SOFT_DELETE")
    return {"message": "Usuario desactivado correctamente"}