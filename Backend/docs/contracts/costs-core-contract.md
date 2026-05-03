# Costs Core Contract

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Expectativa funcional del frontend

El frontend tiene `src/app/features/costs-core/`. Regla esperada:

Todo `InventoryMovement` economico debe generar `CostMovement` idempotente.

Movimientos con impacto economico:

- `COMPRA_RECEPCION`
- `DESPACHO_VENTA`
- `CONSUMO_MP`
- `INGRESO_PT`
- `AJUSTE_POS`
- `AJUSTE_NEG`
- `MERMA_CALIDAD`
- `CONSUMO_REPUESTO_TPM`
- `DEVOLUCION`

Movimientos sin costo directo:

- `BLOQUEO_CALIDAD`
- `LIBERACION_CALIDAD`
- `RECHAZO_CALIDAD`
- `RESERVA_STOCK`
- `LIBERACION_RESERVA`
- `TRANSFER_OUT`
- `TRANSFER_IN`

Endpoints frontend esperados:

- `GET /api/v1/costs-core/{companyId}/product-cost`
- `GET /api/v1/costs-core/{companyId}/movements`
- `POST /api/v1/costs-core/{companyId}/inventory-movements`
- `POST /api/v1/costs-core/{companyId}/product-cost/{productId}/average`
- `GET /api/v1/costs-core/{companyId}/production-orders/{opId}`
- `GET /api/v1/costs-core/{companyId}/products/{productId}/margin`

## Backend real encontrado

No existe router montado para `/api/v1/costs-core`.

Base parcial:

- `schemas/costos.py` define `CostoProductoResponse` y `MargenSKUResponse`.
- `inventario.MovimientoInventario` tiene `costo_unitario` y `costo_total`.
- `Producto.metodo_costo` existe.
- `inventario_service.recalcular_costo_promedio` calcula promedio sobre movimientos `COMPRA` y `PRODUCCION_INGRESO`.
- `produccion.OrdenProduccion` tiene `costo_mp`, `costo_mo`, `costo_ind`, `costo_unitario_final`.
- `ventas.FacturaVenta` tiene `total_costo_venta`.
- BI calcula rentabilidad aproximada.

## Gaps

- No existe `CostMovement`.
- No hay idempotencia por movimiento de inventario.
- No hay API para costo actual por SKU.
- No hay costo promedio/FIFO expuesto como contrato estable.
- No hay integracion con Inventory Core porque Inventory Core no existe.
- No hay costo de orden productiva expuesto.
- No hay margen por producto/SKU desde Costs Core.
- No hay reglas para movimientos sin costo directo.
- No hay cierres de costo ni auditoria de recalculos.

## Riesgos de la base parcial

- `recalcular_costo_promedio` usa tipos `COMPRA` y `PRODUCCION_INGRESO`, distintos al catalogo esperado por frontend.
- Al no existir saldos/lotes/reservas reales, el costo no puede reconciliarse contra inventario.
- BI podria calcular rentabilidad directamente desde tablas transaccionales, pero eso no sustituye Costs Core.

## Veredicto

No hay base backend suficiente para cerrar Costs Core. El documento queda como contrato de ausencia real: antes de integracion se necesita router, modelos, servicios idempotentes, catalogo de tipos alineado con Inventory Core, costo por SKU, costo de orden, costo de venta, margen y trazabilidad.
