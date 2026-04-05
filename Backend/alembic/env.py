import sys
from os import path
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Setup path
BASE_DIR = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.db.session import Base
# Importar todos los modelos para registrar en Base.metadata
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.auditoria import Auditoria
from app.models.configuracion import Configuracion, Modulo, Menu, EmpresaSector, ParametroGeneral

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def include_object(object, name, type_, reflected, compare_to):
    """
    Filtro de seguridad: Si Alembic encuentra una tabla en la DB 
    que NO está definida en nuestros modelos de Python, la ignorará
    en lugar de intentar borrarla (drop).
    """
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True

def run_migrations_online() -> None:
    # DEFINICIÓN DE CONNECTABLE (Aquí se resuelve tu NameError)
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_schemas=True,
            include_object=include_object, # Filtro anti-drop
            version_table_schema='seguridad'
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()