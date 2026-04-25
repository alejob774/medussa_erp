from sqlalchemy.orm import Session
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.schemas.usuarios import UsuarioUpdate

async def actualizar_usuario_completo(db: Session, usuario_id: int, obj_in: UsuarioUpdate):
    # 1. Obtener usuario base
    db_obj = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not db_obj:
        return None

    update_data = obj_in.model_dump(exclude_unset=True)
    
    # 2. Procesar Membresías si vienen en el payload
    if "membresias" in update_data:
        nuevas_membresias = update_data.pop("membresias")
        
        # Obtener membresías actuales en DB para este usuario
        actuales = db.query(UsuarioEmpresaConfig).filter(
            UsuarioEmpresaConfig.usuario_id == usuario_id
        ).all()
        
        # Mapeo para búsqueda rápida {empresa_id: objeto_db}
        mapa_actuales = {m.empresa_id: m for m in actuales}
        ids_nuevos = {m["empresa_id"] for m in nuevas_membresias}

        # A. ELIMINAR: Membresías que están en DB pero no en el nuevo payload
        for emp_id, obj_db in mapa_actuales.items():
            if emp_id not in ids_nuevos:
                db.delete(obj_db)

        # B. AGREGAR O ACTUALIZAR
        for m_in in nuevas_membresias:
            emp_id = m_in["empresa_id"]
            if emp_id in mapa_actuales:
                # Actualizar rol/perfil si ya existe
                obj_existente = mapa_actuales[emp_id]
                obj_existente.rol_id = m_in["rol_id"]
                obj_existente.perfil_id = m_in.get("perfil_id")
            else:
                # Crear nueva membresía (Evita duplicados por lógica de set ids_nuevos)
                nueva_m = UsuarioEmpresaConfig(
                    usuario_id=usuario_id,
                    empresa_id=emp_id,
                    rol_id=m_in["rol_id"],
                    perfil_id=m_in.get("perfil_id")
                )
                db.add(nueva_m)

    # 3. Actualizar campos básicos del usuario
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj