# Production Contract - HU-020 a HU-024

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Nota sobre frontend

Los repositorios API de produccion en frontend (`oee`, `bom-formula`, `quality-control`, `mps`, `tpm`) estan en modo frontend-only/mock y lanzan errores si se usan directamente. Aun asi, el dominio esperado existe en UI/modelos/facades, por lo que el backend debe cubrir dashboards, mutaciones, estados, historico e integracion con Inventory Core donde aplique.

## HU-020 OEE

Endpoint backend observado:

- `POST /api/v1/produccion/oee/registrar`

Que existe:

- Servicio calcula disponibilidad, rendimiento, calidad y OEE.
- Persiste `OEE_Registro`.

Que no existe:

- Dashboard.
- List.
- Detail.
- Update.
- Historico por equipo/turno/planta.
- Registro de paradas/downtime como entidad separada.
- Filtros por empresa desde `get_current_company`.

Dummy/inconsistente:

- `empresa_id` viene en payload (`data['empresa_id']`), no del contexto tenant.

Inventory Core:

- No aplica directamente para saldo, pero OEE debe alimentar BI/produccion. No existe ETL ni datamart.

Veredicto: create puntual, no sostiene HU frontend completa.

## HU-021 BOM / Formulas

Endpoints backend observados:

- `POST /api/v1/produccion/bom/`
- `POST /api/v1/produccion/bom/{id}/aprobar`
- `GET /api/v1/produccion/bom/`
- `GET /api/v1/produccion/bom/{id}`
- `DELETE /api/v1/produccion/bom/{id}`

Que existe:

- Crea encabezado `ProduccionBOM` y detalles.
- Calcula costo estandar de lote/unidad.
- Aprobar cambia formula a `VIGENTE` y marca anteriores como `OBSOLETA`.
- List/detail basicos.

Que no existe:

- Update.
- Rechazo.
- Nueva version controlada.
- Historico/auditoria funcional de cambios.
- Filtros por empresa/producto/estado.
- Validacion tenant.

Inconsistencias:

- `empresa_id` viene de payload con fallback `EMP-DEFAULT`, no de `X-Company-ID`.
- Delete hace borrado fisico.
- No valida que ingredientes/producto pertenezcan a la empresa.

Inventory Core / Costs Core:

- BOM calcula costo interno, pero no se integra con Costs Core.
- No genera consumos `CONSUMO_MP` ni ingresos `INGRESO_PT`; eso deberia ocurrir al ejecutar produccion, no en BOM.

Veredicto: CRUD parcial util como base, no cerrable.

## HU-022 Control de Calidad

Endpoints backend observados:

- `POST /api/v1/produccion/calidad/inspecciones`
- `GET /api/v1/produccion/calidad/inspecciones/{id}`

Que existe:

- Create de inspeccion y detalles.
- Evalua parametros min/max.
- Decide `estado_lote` como `APROBADO` o `RECHAZADO`.

Que esta roto:

- `GET /inspecciones/{id}` usa `CalidadInspeccion` sin importarlo en el router.

Que no existe:

- List/dashboard.
- Update.
- No conformidades.
- Cierre de no conformidad.
- Acciones de lote: bloquear, liberar, rechazar, merma.
- Historico por lote.
- Tenant por `get_current_company`.

Inventory Core:

- No emite `BLOQUEO_CALIDAD`, `LIBERACION_CALIDAD`, `RECHAZO_CALIDAD` ni `MERMA_CALIDAD`.
- No actualiza lote/saldo/reserva.

Veredicto: create parcial; no sostiene HU frontend.

## HU-023 MPS / Plan Maestro

Endpoint backend observado:

- `POST /api/v1/produccion/mps/generar`

Que existe:

- Crea `MPSPlan` y detalles desde `items_base`.
- Estado inicial `BORRADOR`.

Que no existe:

- Dashboard.
- List/detail.
- Update de detalle.
- Simulacion.
- Aprobacion.
- Historico.
- Capacidad real.
- Integracion con demanda/stock.

Dummy/incompleto:

- Horas estimadas calculadas con regla fija `cantidad / 100`.
- `empresa_id` viene de payload con fallback `EMP-001`.

Inventory Core:

- No consulta saldos/reservas ni proyecta consumos/ingresos.

Veredicto: generador parcial, no cerrable.

## HU-024 TPM

Endpoints backend observados:

- `POST /api/v1/produccion/tpm/ordenes`
- `POST /api/v1/produccion/tpm/ordenes/{id}/cerrar`

Que existe:

- Crea OT correctiva.
- Cierra OT con tiempo/costo estimado.
- Modelos `TPMPlan` y `TPMOrdenTrabajo`.

Que no existe:

- Dashboard.
- CRUD de activos TPM.
- CRUD de planes.
- List/detail/update de OT.
- Historico.
- Programacion preventiva.
- Consumo de repuestos.
- Tenant por `get_current_company`.

Inventory Core / Costs Core:

- No genera `CONSUMO_REPUESTO_TPM`.
- No crea movimiento de costo por repuestos.

Veredicto: create/cierre parcial de OT, no sostiene HU frontend.

## Veredicto Produccion

Produccion backend tiene prototipos utiles, pero no contratos completos. Para cerrar HU-020 a HU-024 faltan dashboards, listados, details, updates, estados robustos, historicos, permisos, multiempresa por contexto y la integracion obligatoria con Inventory Core/Costs Core en calidad, MPS/ejecucion productiva y TPM.
