"""fullstack_readiness_tenant_maestros

Revision ID: 3f4a8b9c1d2e
Revises: 2d0e3ea96cdc
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3f4a8b9c1d2e"
down_revision: Union[str, Sequence[str], None] = "2d0e3ea96cdc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clientes", sa.Column("empresa_id", sa.String(length=50), nullable=True), schema="configuracion")
    op.create_index("ix_configuracion_clientes_empresa_id", "clientes", ["empresa_id"], unique=False, schema="configuracion")

    op.add_column("vendedores", sa.Column("empresa_id", sa.String(length=50), nullable=True), schema="configuracion")
    op.create_index("ix_configuracion_vendedores_empresa_id", "vendedores", ["empresa_id"], unique=False, schema="configuracion")

    op.add_column("conductores", sa.Column("empresa_id", sa.String(length=50), nullable=True), schema="configuracion")
    op.create_index("ix_configuracion_conductores_empresa_id", "conductores", ["empresa_id"], unique=False, schema="configuracion")

    op.add_column("equipos", sa.Column("empresa_id", sa.String(length=50), nullable=True), schema="configuracion")
    op.create_index("ix_configuracion_equipos_empresa_id", "equipos", ["empresa_id"], unique=False, schema="configuracion")

    op.add_column("rutas", sa.Column("empresa_id", sa.String(length=50), nullable=True), schema="logistica")
    op.add_column("rutas", sa.Column("origen", sa.String(length=150), nullable=True), schema="logistica")
    op.add_column("rutas", sa.Column("destino", sa.String(length=150), nullable=True), schema="logistica")
    op.add_column("rutas", sa.Column("distancia_km", sa.Float(), nullable=True), schema="logistica")
    op.create_index("ix_logistica_rutas_empresa_id", "rutas", ["empresa_id"], unique=False, schema="logistica")


def downgrade() -> None:
    op.drop_index("ix_logistica_rutas_empresa_id", table_name="rutas", schema="logistica")
    op.drop_column("rutas", "distancia_km", schema="logistica")
    op.drop_column("rutas", "destino", schema="logistica")
    op.drop_column("rutas", "origen", schema="logistica")
    op.drop_column("rutas", "empresa_id", schema="logistica")

    op.drop_index("ix_configuracion_equipos_empresa_id", table_name="equipos", schema="configuracion")
    op.drop_column("equipos", "empresa_id", schema="configuracion")

    op.drop_index("ix_configuracion_conductores_empresa_id", table_name="conductores", schema="configuracion")
    op.drop_column("conductores", "empresa_id", schema="configuracion")

    op.drop_index("ix_configuracion_vendedores_empresa_id", table_name="vendedores", schema="configuracion")
    op.drop_column("vendedores", "empresa_id", schema="configuracion")

    op.drop_index("ix_configuracion_clientes_empresa_id", table_name="clientes", schema="configuracion")
    op.drop_column("clientes", "empresa_id", schema="configuracion")
