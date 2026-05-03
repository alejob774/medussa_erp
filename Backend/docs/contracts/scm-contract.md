# SCM Contract - HU-025 a HU-032

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Brecha general de rutas

Frontend espera:

- `/api/v1/scm/demand-forecasts`
- `/api/v1/scm/demand-analysis`
- `/api/v1/scm/product-development`
- `/api/v1/scm/purchase-analysis`
- `/api/v1/scm/budget-management`
- `/api/v1/scm/inventory-cycle`
- `/api/v1/scm/storage-layout`

Backend expone:

- `/api/v1/scm/demanda`
- `/api/v1/scm/analisis`
- `/api/v1/scm/productos`
- `/api/v1/scm/compras`
- `/api/v1/scm/presupuesto`
- `/api/v1/scm/inventario/ciclo`
- `/api/v1/scm/inventario/layout`
- `/api/v1/wms`

La incompatibilidad de rutas ya bloquea integracion directa.

## HU-025 Gestion de Demanda

Endpoints backend observados:

- `GET /api/v1/scm/demanda/forecast`
- `GET /api/v1/scm/demanda/dashboard/kpis`
- `GET /api/v1/scm/demanda/config/estados`
- `PATCH /api/v1/scm/demanda/forecast/{forecast_id}`

Que existe:

- Modelos `Forecast` y `ForecastDetalle`.
- Servicio `crear_plan_demanda`, pero no esta expuesto por router.
- Catalogo de estados estatico.

Que esta roto:

- Router llama `obtener_todos_forecasts`, `calcular_kpis_demanda`, `obtener_forecast_por_id`, `actualizar_forecast_db`; no existen en `demanda_service.py`.

Falta:

- Create real compatible.
- Dashboard compatible.
- Detail.
- Update robusto.
- Aprobacion.
- Historico.
- Estados transaccionales.

Veredicto: no sostiene frontend actual.

## HU-026 Analisis de Demanda

Endpoints backend observados:

- `POST /api/v1/scm/analisis/procesar`
- `GET /api/v1/scm/analisis/dashboard`

Que existe:

- Calcula y persiste `DemandaAnalisis` y `DemandaAlerta`.
- Dashboard basico con precision y ventas periodo.

Dummy/incompleto:

- Ventas reales hardcoded en `120.0`.
- Consulta todos los detalles de forecast sin filtrar por empresa/periodo.
- Recibe `empresa_id` por query, no por `get_current_company`.
- No coincide con frontend `/scm/demand-analysis`.

Veredicto: prototipo parcial, no cerrable.

## HU-027 Diseno y Desarrollo de Productos

Endpoint backend observado:

- `POST /api/v1/scm/productos/`

Que existe:

- Crea proyecto de desarrollo y BOM preliminar.
- Valida que empresa exista.
- Servicio tiene funcion `convertir_a_maestro`, pero no esta expuesta por router.

Falta:

- Dashboard.
- List/detail/update.
- CRUD de BOM preliminar.
- Evaluate.
- Approve/reject.
- Launch.
- Historico y estados completos.
- Ruta frontend `/scm/product-development`.

Veredicto: solo create parcial; no sostiene HU frontend.

## HU-028 Analisis Estrategico de Compras

Endpoints backend observados:

- `POST /api/v1/scm/compras/procesar`
- `GET /api/v1/scm/compras/dashboard`

Que existe:

- Modelo `CompraAnalisis`.
- Servicio persiste un registro.

Dummy/incompleto:

- `proveedor_id=1` hardcoded.
- Total comprado, lead time, calidad y cumplimiento son simulados.
- Dashboard responde "en construccion".
- No hay refresh/dashboard compatible con frontend `/scm/purchase-analysis`.

Veredicto: dummy con persistencia minima; no cerrable.

## HU-029 Gestion de Presupuesto

Endpoints backend observados:

- `POST /api/v1/scm/presupuesto/cargar`
- `GET /api/v1/scm/presupuesto/ejecucion/{presupuesto_id}`

Que existe:

- Modelos `Presupuesto`, `PresupuestoAlerta`, `CentroCosto`.

Dummy/incompleto:

- `cargar` no persiste.
- `ejecucion` devuelve valores hardcoded.
- No valida empresa del presupuesto.
- No existe ruta frontend `/scm/budget-management`.
- No hay create/list/detail/update/aprobacion/historico/dashboard.

Veredicto: no cerrable.

## HU-030 Ciclo de Inventarios

Endpoints backend observados:

- `POST /api/v1/scm/inventario/ciclo/conteo/iniciar`
- `POST /api/v1/scm/inventario/ciclo/conteo/registrar-linea`
- `GET /api/v1/scm/inventario/ciclo/conteo/{conteo_id}/diferencias`

Que existe:

- Modelos `InventarioConteo` y `InventarioConteoDetalle`.

Dummy/incompleto:

- Iniciar conteo retorna siempre `id=1`.
- Registrar linea solo devuelve mensaje.
- Diferencias devuelve `MAT-001` hardcoded.
- No hay aprobacion/cierre real.
- No hay ajustes `AJUSTE_POS`/`AJUSTE_NEG` en Inventory Core.
- No coincide con `/scm/inventory-cycle/{companyId}`.

Veredicto: no cerrable.

## HU-031 Layout y Almacenamiento Estrategico

Endpoints backend observados:

- `POST /api/v1/scm/inventario/layout/zonas`
- `POST /api/v1/scm/inventario/layout/reubicar`
- `GET /api/v1/scm/inventario/layout/bodega/{bodega_id}/ocupacion`

Que existe:

- Modelos `UbicacionLayout` y `ReubicacionLog`.

Dummy/incompleto:

- Crear zona no persiste.
- Reubicar no persiste ni valida capacidad.
- Ocupacion devuelve datos hardcoded.
- No hay warehouse/location/assignment CRUD compatible con frontend.
- No emite `TRANSFER_OUT`/`TRANSFER_IN` en Inventory Core.

Veredicto: no cerrable.

## HU-032 Picking y Packing

Endpoints backend observados:

- `POST /api/v1/wms/picking/generar`
- `POST /api/v1/wms/picking/confirmar-item`
- `POST /api/v1/wms/packing/cerrar`

Que existe:

- Modelos WMS de pedido, detalle, tarea picking y packing.

Dummy/incompleto:

- Endpoints solo retornan mensajes.
- No consulta ni actualiza modelos WMS.
- FKs apuntan a esquemas discutibles (`configuracion.usuarios`, cuando usuarios reales estan en `seguridad.usuarios`).
- No reserva stock ni descuenta inventario.
- No genera `RESERVA_STOCK`, `LIBERACION_RESERVA` ni `DESPACHO_VENTA`.
- Frontend API repository de picking/packing esta en modo frontend-only y no tiene rutas concretas equivalentes.

Veredicto: prototipo sin persistencia; no cerrable.

## Veredicto SCM

SCM HU-025 a HU-032 no puede cerrarse contra frontend actual. El backend tiene modelos y endpoints de prueba, pero faltan rutas contractuales, persistencia real, dashboards, estados, aprobaciones, historicos, y sobre todo integracion con Inventory Core para HU-030, HU-031 y HU-032.
