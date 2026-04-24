from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(200))
    
    # 3. RELACIÓN OBLIGATORIA CON EMPRESA_ID (Garantiza segregación)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    
    permisos = Column(JSON)
    estado = Column(String, default="activo") # "activo" o "inactivo"
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

class Perfil(Base):
    # 1. CORRECCIÓN: Uso de __tablename__ = 'perfiles_empresa'
    __tablename__ = "perfiles_empresa"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(300))
    
    # 3. RELACIÓN OBLIGATORIA CON EMPRESA_ID
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    
    estado = Column(String, default="activo")
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

class UsuarioEmpresaRol(Base):
    __tablename__ = "usuarios_empresas_roles"
    __table_args__ = (
        {"schema": "seguridad", "extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("seguridad.usuarios.id"), nullable=False)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    rol_id = Column(Integer, ForeignKey("seguridad.roles.id"), nullable=False)
    
    # 2. CORRECCIÓN: Llave foránea apuntando correctamente a seguridad.perfiles_empresa.id
    perfil_id = Column(Integer, ForeignKey("seguridad.perfiles_empresa.id"), nullable=True)
    
    estado = Column(String, default="activo")