# Inventory Core Contract

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Expectativa funcional del frontend

El frontend tiene `src/app/features/inventory-core/` como capa conceptual interna. La regla esperada es:

Modulo funcional -> Inventory Core -> movimiento/kardex -> recalculo de saldo.

Tipos de movimiento esperados:

- `COMPRA_RECEPCION`
- `DESPACHO_VENTA`
- `CONSUMO_MP`
- `INGRESO_PT`
- `AJUSTE_POS`
- `AJUSTE_NEG`
- `TRANSFER_OUT`
- `TRANSFER_IN`
- `DEVOLUCION`
- `BLOQUEO_CALIDAD`
- `LIBERACION_CALIDAD`
- `RECHAZO_CALIDAD`
- `MERMA_CALIDAD`
- `RESERVA_STOCK`
- `LIBERACION_RESERVA`
- `CONSUMO_REPUESTO_TPM`

Endpoints frontend API-ready esperados:

- `GET /api/v1/inventory-core/{companyId}/stock`
- `GET /api/v1/inventory-core/{companyId}/movements`
- `POST /api/v1/inventory-core/{companyId}/adjustments`
- `POST /api/v1/inventory-core/{companyId}/issues`
- `POST /api/v1/inventory-core/{companyId}/reservations`
- `POST /api/v1/inventory-core/{companyId}/reservations/{reservationId}/release`
- `POST /api/v1/inventory-core/{companyId}/lots/{loteId}/block`
- `POST /api/v1/inventory-core/{companyId}/lots/{loteId}/release`
- `POST /api/v1/inventory-core/{companyId}/lots/{loteId}/reject`
- `POST /api/v1/inventory-core/{companyId}/quality/waste`
- `POST /api/v1/inventory-core/{companyId}/transfers`
- `POST /api/v1/inventory-core/{companyId}/spare-parts/consume`

## Backend real encontrado

No existe router montado para `/api/v1/inventory-core`.

Base parcial:

- `inventario.Producto`
- `inventario.MovimientoInventario`
- `inventario_service.recalcular_costo_promedio`
- router `/api/v1/inventario` para maestro de productos

`MovimientoInventario` tiene:

- `empresa_id`
- `producto_id`
- `tipo_movimiento`
- `cantidad`
- `costo_unitario`
- `costo_total`
- `fecha_mov`

No hay modelos/servicios/endpoints observados para:

- saldos por almacen/ubicacion/lote;
- kardex consultable;
- lotes;
- reservas;
- liberacion de reservas;
- salidas/despachos;
- ajustes de conteo conectados a saldos;
- bloqueo/liberacion/rechazo de calidad;
- transferencias/reubicaciones con doble movimiento;
- consumo de repuestos TPM;
- idempotencia de movimientos;
- recalculo de saldos;
- integracion con Costs Core.

## Productos / inventario maestro

Endpoints reales:

- `GET /api/v1/inventario/`
- `GET /api/v1/inventario/{producto_id}`
- `POST /api/v1/inventario/`
- `PATCH /api/v1/inventario/{producto_id}`
- `DELETE /api/v1/inventario/{producto_id}`

Estado:

- List: existe y filtra por empresa.
- Detail: roto por funcion faltante.
- Create: existe, pero schema y modelo no coinciden.
- Update: roto por funcion faltante.
- Delete: roto porque depende de update faltante.

Tenant/context:

- Depende de `X-Company-ID` en `ContextVar`.
- El frontend actual no envia `X-Company-ID` de forma transversal.

## Integraciones faltantes por HU

### HU-022 Calidad

Backend calidad decide `estado_lote`, pero no genera movimientos `BLOQUEO_CALIDAD`, `LIBERACION_CALIDAD`, `RECHAZO_CALIDAD` ni `MERMA_CALIDAD`. Tampoco actualiza lote/saldo.

### HU-024 TPM

Backend TPM crea/cierra OT, pero no consume repuestos ni emite `CONSUMO_REPUESTO_TPM`.

### HU-030 Ciclo de Inventarios

Backend SCM inventario ciclico retorna respuestas dummy. No genera `AJUSTE_POS`/`AJUSTE_NEG` ni recalcula saldo.

### HU-031 Layout y almacenamiento

Backend layout retorna dummy y no emite `TRANSFER_OUT`/`TRANSFER_IN`. No hay stock por ubicacion.

### HU-032 Picking/Packing

Backend WMS retorna mensajes dummy. No reserva stock, no libera reserva, no descuenta por despacho y no genera `DESPACHO_VENTA`.

## Veredicto

No existe Inventory Core backend real. Hay una tabla de movimientos de inventario, pero no la capa transaccional que el frontend espera. Para cerrar fullstack, backend debe crear el dominio Inventory Core como servicio central, con endpoints, modelos de saldo/lote/reserva/kardex, idempotencia, integraciones de calidad/TPM/SCM/WMS y recalculo consistente de saldos.
