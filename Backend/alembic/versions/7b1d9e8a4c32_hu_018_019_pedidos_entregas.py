"""hu_018_019_pedidos_entregas

Revision ID: 7b1d9e8a4c32
Revises: 3f4a8b9c1d2e
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7b1d9e8a4c32"
down_revision: Union[str, Sequence[str], None] = "3f4a8b9c1d2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS comercial")

    op.create_table(
        "pedidos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("local_uuid", sa.String(length=80), nullable=False),
        sa.Column("numero_pedido", sa.String(length=40), nullable=False),
        sa.Column("empresa_id", sa.String(length=50), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), nullable=True),
        sa.Column("conductor_id", sa.Integer(), nullable=True),
        sa.Column("ruta_id", sa.Integer(), nullable=True),
        sa.Column("vehiculo_id", sa.Integer(), nullable=True),
        sa.Column("fecha_pedido", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("fecha_entrega_solicitada", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_entrega_real", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tipo_pedido", sa.String(length=40), nullable=True),
        sa.Column("canal_venta", sa.String(length=40), nullable=True),
        sa.Column("prioridad", sa.String(length=20), nullable=True),
        sa.Column("condicion_pago", sa.String(length=80), nullable=True),
        sa.Column("estado", sa.String(length=40), nullable=False, server_default="CREADA"),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("impuesto", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("reserva_inventario", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("synced", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("rechazo_motivo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cliente_id"], ["configuracion.clientes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("empresa_id", "local_uuid", name="uq_pedidos_empresa_local_uuid"),
        sa.UniqueConstraint("numero_pedido", name="uq_comercial_pedidos_numero_pedido"),
        schema="comercial",
    )
    op.create_index("ix_comercial_pedidos_local_uuid", "pedidos", ["local_uuid"], schema="comercial")
    op.create_index("ix_comercial_pedidos_numero_pedido", "pedidos", ["numero_pedido"], schema="comercial")
    op.create_index("ix_comercial_pedidos_empresa_id", "pedidos", ["empresa_id"], schema="comercial")
    op.create_index("ix_comercial_pedidos_empresa_estado", "pedidos", ["empresa_id", "estado"], schema="comercial")

    op.create_table(
        "pedido_detalle",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("pedido_id", sa.String(length=36), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("bodega_id", sa.Integer(), nullable=True),
        sa.Column("sku", sa.String(length=80), nullable=True),
        sa.Column("producto_nombre", sa.String(length=180), nullable=True),
        sa.Column("presentacion", sa.String(length=80), nullable=True),
        sa.Column("unidad", sa.String(length=30), nullable=True),
        sa.Column("cantidad", sa.Numeric(14, 4), nullable=False),
        sa.Column("cantidad_reservada", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("cantidad_entregada", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("precio_unitario", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total_linea", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("stock_disponible", sa.Numeric(14, 4), nullable=True),
        sa.Column("entrega_posterior", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["pedido_id"], ["comercial.pedidos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )
    op.create_index("ix_comercial_pedido_detalle_pedido_id", "pedido_detalle", ["pedido_id"], schema="comercial")

    op.create_table(
        "pedidos_consolidado",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=50), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("vendedor_id", sa.Integer(), nullable=True),
        sa.Column("ruta_id", sa.Integer(), nullable=True),
        sa.Column("total_pedidos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_unidades", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("total_valor", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )
    op.create_index("ix_comercial_pedidos_consolidado_empresa_id", "pedidos_consolidado", ["empresa_id"], schema="comercial")

    op.create_table(
        "pedidos_consolidado_detalle",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("consolidado_id", sa.String(length=36), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=True),
        sa.Column("producto_nombre", sa.String(length=180), nullable=True),
        sa.Column("cantidad_total", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("valor_total", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["consolidado_id"], ["comercial.pedidos_consolidado.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )

    op.create_table(
        "entregas_pedido",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("pedido_id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=50), nullable=False),
        sa.Column("conductor_id", sa.Integer(), nullable=True),
        sa.Column("ruta_id", sa.Integer(), nullable=True),
        sa.Column("vehiculo_id", sa.Integer(), nullable=True),
        sa.Column("usuario_entrega_id", sa.Integer(), nullable=True),
        sa.Column("fecha_entrega", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("firma_cliente", sa.Text(), nullable=False),
        sa.Column("foto_entrega", sa.Text(), nullable=True),
        sa.Column("gps_latitud", sa.Numeric(10, 7), nullable=True),
        sa.Column("gps_longitud", sa.Numeric(10, 7), nullable=True),
        sa.Column("comentarios", sa.Text(), nullable=True),
        sa.Column("estado", sa.String(length=40), nullable=False, server_default="REGISTRADA"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["pedido_id"], ["comercial.pedidos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )
    op.create_index("ix_comercial_entregas_pedido_empresa_id", "entregas_pedido", ["empresa_id"], schema="comercial")

    op.create_table(
        "entregas_pedido_detalle",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("entrega_id", sa.String(length=36), nullable=False),
        sa.Column("pedido_detalle_id", sa.String(length=36), nullable=True),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=True),
        sa.Column("producto_nombre", sa.String(length=180), nullable=True),
        sa.Column("cantidad_entregada", sa.Numeric(14, 4), nullable=False),
        sa.Column("unidad", sa.String(length=30), nullable=True),
        sa.ForeignKeyConstraint(["entrega_id"], ["comercial.entregas_pedido.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pedido_detalle_id"], ["comercial.pedido_detalle.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )

    op.create_table(
        "trazabilidad_pedidos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("pedido_id", sa.String(length=36), nullable=False),
        sa.Column("empresa_id", sa.String(length=50), nullable=False),
        sa.Column("estado_anterior", sa.String(length=40), nullable=True),
        sa.Column("estado_nuevo", sa.String(length=40), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("fecha", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["pedido_id"], ["comercial.pedidos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="comercial",
    )
    op.create_index("ix_comercial_trazabilidad_pedidos_empresa_id", "trazabilidad_pedidos", ["empresa_id"], schema="comercial")


def downgrade() -> None:
    op.drop_index("ix_comercial_trazabilidad_pedidos_empresa_id", table_name="trazabilidad_pedidos", schema="comercial")
    op.drop_table("trazabilidad_pedidos", schema="comercial")
    op.drop_table("entregas_pedido_detalle", schema="comercial")
    op.drop_index("ix_comercial_entregas_pedido_empresa_id", table_name="entregas_pedido", schema="comercial")
    op.drop_table("entregas_pedido", schema="comercial")
    op.drop_table("pedidos_consolidado_detalle", schema="comercial")
    op.drop_index("ix_comercial_pedidos_consolidado_empresa_id", table_name="pedidos_consolidado", schema="comercial")
    op.drop_table("pedidos_consolidado", schema="comercial")
    op.drop_index("ix_comercial_pedido_detalle_pedido_id", table_name="pedido_detalle", schema="comercial")
    op.drop_table("pedido_detalle", schema="comercial")
    op.drop_index("ix_comercial_pedidos_empresa_estado", table_name="pedidos", schema="comercial")
    op.drop_index("ix_comercial_pedidos_empresa_id", table_name="pedidos", schema="comercial")
    op.drop_index("ix_comercial_pedidos_numero_pedido", table_name="pedidos", schema="comercial")
    op.drop_index("ix_comercial_pedidos_local_uuid", table_name="pedidos", schema="comercial")
    op.drop_table("pedidos", schema="comercial")
