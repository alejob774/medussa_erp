# app/core/roles_guard.py
from fastapi import HTTPException, Depends
from app.api.v1.auth import get_current_user

def tiene_permiso(permiso_requerido: str):
    def decorator(current_user: Usuario = Depends(get_current_user)):
        # Buscamos el rol del usuario EN LA EMPRESA ACTUAL del token
        # Esto cumple con el Escenario Tres de HU-000 (Segregación)
        rol_actual = current_user.get_rol_for_empresa(current_user.empresa_id_activa)
        
        if permiso_requerido not in rol_actual.permisos:
            raise HTTPException(
                status_code=403, 
                detail=f"No tiene el permiso: {permiso_requerido} en esta empresa"
            )
        return True
    return decorator