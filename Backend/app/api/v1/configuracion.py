from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/menu-lateral/{rol_id}")
def obtener_menu_por_rol(rol_id: int, db: Session = Depends(get_db)):
    try:
        # Consulta para traer la estructura jerárquica
        query = text("""
            SELECT 
                m.nombre as modulo_nombre, 
                m.icono as modulo_icono,
                me.nombre as menu_nombre, 
                me.url as menu_url, 
                me.icono as menu_icono
            FROM configuracion.modulos m
            JOIN configuracion.menus me ON m.id = me.modulo_id
            JOIN seguridad.rol_permisos rp ON m.id = rp.modulo_id
            WHERE rp.rol_id = :rol_id 
              AND m.estado = true 
              AND rp.puede_leer = true
            ORDER BY m.orden, me.orden
        """)
        
        resultado = db.execute(query, {"rol_id": rol_id}).fetchall()
        
        # Agrupamiento dinámico por módulo
        menu_final = []
        modulos_dict = {}

        for fila in resultado:
            if fila.modulo_nombre not in modulos_dict:
                nuevo_modulo = {
                    "modulo": fila.modulo_nombre,
                    "icono": fila.modulo_icono,
                    "submenus": []
                }
                modulos_dict[fila.modulo_nombre] = nuevo_modulo
                menu_final.append(nuevo_modulo)
            
            modulos_dict[fila.modulo_nombre]["submenus"].append({
                "nombre": fila.menu_nombre,
                "url": fila.menu_url,
                "icono": fila.menu_icono
            })
            
        return menu_final

    except Exception as e:
        print(f"DEBUG ERROR CONFIG: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al cargar menú: {str(e)}")