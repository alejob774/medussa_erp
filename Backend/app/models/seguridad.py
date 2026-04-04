from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Boolean, func
from app.db.session import Base

class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(50))
    empresa_id = Column(String, ForeignKey("configuracion.configuraciones.empresa_id"))
    permisos = Column(JSON)
    estado = Column(String, default="activo") # "activo" o "inactivo"
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

class UsuarioEmpresaRol(Base):
    __tablename__ = "usuarios_empresas_roles"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seguridad.usuarios.id"))
    empresa_id = Column(String, ForeignKey("configuracion.configuraciones.empresa_id"))
    rol_id = Column(Integer, ForeignKey("seguridad.roles.id"))
    estado = Column(String, default="activo")
    
class Perfil(Base):
    __tablename__ = "perfiles_empresa"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False) # perfilNombre en HU [cite: 83]
    descripcion = Column(String(300))
    empresa_id = Column(String, ForeignKey("configuracion.configuraciones.empresa_id"))
    permisos = Column(JSON, nullable=False) # Árbol de permisos [cite: 83, 93]
    estado = Column(Boolean, default=True) # Manejo booleano según HU [cite: 83]
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())