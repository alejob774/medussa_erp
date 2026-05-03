# BI Backend Contract - HU-033 a HU-038

Base auditada: frontend `devJ` contra backend `HU-Developing`.

## Regla esperada por frontend

Flujo BI esperado:

ERP transaccional -> ETL/staging -> Data Warehouse/datamarts -> Grafana -> Medussa ERP.

Grafana no debe consultar directamente la base transaccional ERP. Angular debe consumir dashboards/metadatos autorizados, no calcular indicadores finales.

## Endpoints backend observados

Montados bajo `/api/v1/bi`:

- `GET /dashboard-ejecutivo`
- `GET /rentabilidad-producto-linea`
- `GET /alertas-gerenciales`
- `GET /ventas-cumplimiento-comercial`
- `GET /clientes-estrategicos`
- `GET /demanda-vs-forecast`

No existe:

- `GET /api/v1/bi/grafana/dashboards`

## Base real encontrada

Modelos:

- `AlertaDashboard`
- `FactRentabilidadProducto`
- `FactVentasComercial`
- `FactClienteVentas`
- `DimCliente`
- `FactForecastDemanda`

Servicios:

- rentabilidad por producto/linea;
- alertas gerenciales;
- ventas/cumplimiento;
- clientes estrategicos;
- demanda vs forecast.

No se encontro:

- ETL.
- Staging.
- DW con prefijo `dw_`.
- Datamarts `dm_*`.
- Integracion Grafana.
- Tokens/URLs de embedding.
- Scheduler de refresh.

## HU-033 Dashboard Ejecutivo 360

Endpoint:

- `GET /api/v1/bi/dashboard-ejecutivo`

Estado real:

- Router llama `bi_service.obtener_kpis_ejecutivos`, funcion inexistente.

Veredicto: roto; no cerrable.

## HU-034 Rentabilidad por Producto / Linea

Endpoint:

- `GET /api/v1/bi/rentabilidad-producto-linea`

Estado real:

- Calcula rentabilidad consultando `FacturaVenta` y `Producto`.
- Usa `empresaId` como query param, no `get_current_company`.
- Aplica indirectos como 15% hardcoded de ventas.

Riesgos:

- Join observado `Producto.id == FacturaVenta.id`, probablemente incorrecto para producto vendido.
- No usa Costs Core ni datamart.
- No retorna toda la estructura esperada por frontend BI.

Veredicto: parcial y transaccional; no DW-ready.

## HU-035 Alertas Gerenciales

Endpoint:

- `GET /api/v1/bi/alertas-gerenciales`

Estado real:

- Consulta `AlertaDashboard` por empresa y estado.
- Usa `get_current_company`.

Gaps:

- No hay motor real de generacion/cierre de alertas conectado a procesos.
- No hay resumen semaforo contractual.
- No hay filtros completos por severidad/tipo/fechas.
- Requiere `X-Company-ID`, que frontend no envia globalmente.

Veredicto: base parcial.

## HU-036 Ventas y Cumplimiento Comercial

Endpoint:

- `GET /api/v1/bi/ventas-cumplimiento-comercial`

Estado real:

- Agrega `FactVentasComercial`.
- Calcula ventas dia/mes, cumplimiento, ticket, conversion.

Bloqueos:

- `bi.py` usa `HTTPException` sin importarlo.
- Valida `current_user.rol`, pero `Usuario` no tiene atributo `rol`.
- Top vendedores, ventas zona y top clientes estan vacios.
- No usa DW/datamart.

Veredicto: puede fallar runtime; no cerrable.

## HU-037 Clientes Estrategicos

Endpoint:

- `GET /api/v1/bi/clientes-estrategicos`

Estado real:

- Consulta `FactClienteVentas` y `DimCliente`.
- Calcula top clientes e inactivos.

Bloqueos/gaps:

- Usa `HTTPException` sin import.
- Permisos por rol usan atributo inexistente.
- No retorna toda la estructura frontend esperada (`ticketPromedioCliente`, `frecuenciaCompra`, concentracion detallada, tendencia).
- No usa DW/datamart.

Veredicto: parcial y con riesgo runtime.

## HU-038 Demanda vs Forecast

Endpoint:

- `GET /api/v1/bi/demanda-vs-forecast`

Estado real:

- Intenta consultar `FactForecastDemanda`.

Bloqueos:

- `bi_service.py` no importa `FactForecastDemanda`, aunque lo usa.
- Permisos por rol usan atributo inexistente.
- No retorna toda la estructura frontend esperada.
- No hay ETL desde forecast/ventas reales a fact BI.

Veredicto: roto/incompleto.

## Grafana readiness

No hay endpoint `grafana/dashboards`, no hay configuracion de dashboard UID, no hay signed URLs, no hay embedding seguro y no hay evidencia de que Grafana consulte datamarts. La base actual consulta modelos SQLAlchemy dentro del backend ERP.

## Veredicto BI

BI tiene una base de tablas fact/dim y prototipos de consulta, pero no esta listo para HU-033 a HU-038. Falta ETL/staging/DW/datamarts/Grafana, permisos reales, respuestas contractuales completas y correcciones de errores runtime. Mientras tanto, el frontend debe seguir en mock para BI.
