# Contrato Backend BI / Grafana - Medussa ERP

## Proposito

Este contrato define la base de integracion para el bloque BI de Medussa ERP. La regla arquitectonica es que Angular no calcula dashboards finales: el ERP transaccional alimenta procesos ETL/staging, estos consolidan un Data Warehouse o datamarts, Grafana consulta esos datamarts, y Medussa ERP embebe o consume metadata autorizada.

Flujo esperado:

ERP transaccional -> ETL / staging -> Data Warehouse / datamarts -> Grafana -> Medussa ERP

## Reglas generales

- Todos los endpoints deben validar autenticacion y permisos antes de retornar datos.
- Todos los filtros deben respetar `empresaId`; nunca se debe inferir acceso multiempresa solo desde el query string.
- Los datos BI deben provenir de DW/datamarts, no de consultas directas a la base transaccional.
- En esta fase frontend-only, Angular usa mock data contractual para El Arbolito (`medussa-holding`).
- Las respuestas pueden incluir metadata `grafana` con `dashboardUid`, `dashboardUrl` y filtros aplicados cuando el backend habilite embedding.

## Errores estandar

- `401`: token invalido o vencido.
- `403`: usuario sin permisos para empresa/dashboard.
- `404`: no hay datos para el filtro solicitado.
- `500`: error generando dashboard o consultando datamart.

Formato sugerido:

```json
{
  "code": "BI_DASHBOARD_ERROR",
  "message": "No fue posible generar el tablero solicitado.",
  "traceId": "req-..."
}
```

## Permisos esperados

- `bi.executive.view`: HU-033 Dashboard Ejecutivo 360.
- `bi.profitability.view`: HU-034 Rentabilidad por Producto / Linea.
- `bi.alerts.view`: HU-035 Alertas Gerenciales.
- `bi.commercial.view`: HU-036 Ventas y Cumplimiento Comercial.
- `bi.clients.view`: HU-037 Clientes Estrategicos.
- `bi.forecast.view`: HU-038 Demanda vs Forecast.

## Endpoints

### HU-033 Dashboard Ejecutivo 360

`GET /api/v1/bi/dashboard-ejecutivo`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `sedeId`
- `moneda`

Respuesta:

```ts
{
  filters: ExecutiveDashboardFilters;
  ventasMes: BiMetricValue;
  cumplimientoPresupuesto: BiMetricValue;
  produccionVsPlan: BiMetricValue;
  inventarioTotal: BiMetricValue;
  otif: BiMetricValue;
  margenEstimado: BiMetricValue;
  alertasCriticas: BiMetricValue;
  alertas?: ExecutiveCriticalAlert[];
  tendencias?: {
    ventas?: BiTrendPoint[];
    margen?: BiTrendPoint[];
    otif?: BiTrendPoint[];
  };
  grafana?: BiDashboardEmbedConfig | null;
}
```

Refresh esperado: 15 minutos.

### HU-034 Rentabilidad por Producto / Linea

`GET /api/v1/bi/rentabilidad-producto-linea`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `lineaProductoId`
- `productoId`
- `top`
- `moneda`

Respuesta:

```ts
{
  productoMasRentable: ProductProfitabilityItem | null;
  productoMenosRentable: ProductProfitabilityItem | null;
  margenBrutoPromedio: number;
  costosVariables: number;
  costosIndirectos: number;
  utilidadEstimadaTotal: number;
  topRentables: ProductProfitabilityItem[];
  topNoRentables: ProductProfitabilityItem[];
  rentabilidadLineas: ProductLineProfitabilityItem[];
  rankingProductos: ProductProfitabilityItem[];
  lecturaEjecutiva: ProfitabilityExecutiveInsight[];
  grafana?: BiDashboardEmbedConfig | null;
}
```

Refresh esperado: 1 hora o al cierre de lote de Costos Core.

### HU-035 Alertas Gerenciales

`GET /api/v1/bi/alertas-gerenciales`

Filtros:

- `empresaId`
- `sedeId`
- `estado`
- `severidad`
- `tipoAlerta`
- `fechaDesde`
- `fechaHasta`

Respuesta:

```ts
{
  alertas: ManagerialAlert[];
  resumenSemaforo: ManagerialTrafficLightSummary;
  totalAbiertas: number;
  totalRojas: number;
  totalAmarillas: number;
  totalVerdes: number;
}
```

Refresh esperado: 5 minutos.

### HU-036 Ventas y Cumplimiento Comercial

`GET /api/v1/bi/ventas-cumplimiento-comercial`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `zonaId`
- `vendedorId`
- `clienteId`

Respuesta:

```ts
{
  ventasDia: number;
  ventasMes: number;
  cumplimientoMeta: number;
  ticketPromedio: number;
  conversionComercial: number;
  topVendedores: CommercialSellerRankingItem[];
  ventasPorZona: SalesByZoneItem[];
  topClientes: CommercialTopClientItem[];
  grafana?: BiDashboardEmbedConfig | null;
}
```

Refresh esperado: 15 minutos.

### HU-037 Clientes Estrategicos

`GET /api/v1/bi/clientes-estrategicos`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `vendedorId`
- `zonaId`
- `clienteId`

Respuesta:

```ts
{
  topClientes: StrategicClientRankingItem[];
  clientesInactivos: InactiveClientItem[];
  crecimientoClientes: StrategicClientGrowthItem[];
  concentracionVentasTop5: number;
  concentracionVentasTop10: number;
  ticketPromedioCliente: number;
  frecuenciaCompra: number;
  concentracion: SalesConcentrationSummary;
  grafana?: BiDashboardEmbedConfig | null;
}
```

Refresh esperado: 30 minutos.

### HU-038 Demanda vs Forecast

`GET /api/v1/bi/demanda-vs-forecast`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `productoId`
- `lineaId`
- `zonaId`

Respuesta:

```ts
{
  forecastTotal: number;
  ventaReal: number;
  desviacionAbsoluta: number;
  errorForecastPct: number;
  precisionPct: number;
  subestimados: ForecastDeviationItem[];
  sobrestimados: ForecastDeviationItem[];
  precisionSegmentos: ForecastAccuracySegmentItem[];
  lecturaEjecutiva: string;
  tendenciaForecastReal: BiTrendPoint[];
  grafana?: BiDashboardEmbedConfig | null;
}
```

Refresh esperado: 30 minutos o al aprobar forecast.

## Grafana Foundation

Endpoint sugerido para metadata autorizada:

`GET /api/v1/bi/grafana/dashboards?empresaId=...`

Respuesta:

```ts
GrafanaDashboardConfig[]
```

En una fase posterior el backend puede retornar `BiDashboardEmbedConfig` con:

- `dashboardUid`
- `dashboardUrl`
- `iframeAllowed`
- `filters`
- `signedAt`
- `expiresAt`

El backend debe validar permisos y empresa antes de entregar URLs o tokens de embedding. Grafana debe consultar datamarts/DW; no debe conectarse directamente a tablas transaccionales del ERP.

## Tablas DW sugeridas

- `dw_dim_empresa`
- `dw_dim_fecha`
- `dw_dim_sede`
- `dw_dim_producto`
- `dw_dim_linea_producto`
- `dw_dim_cliente`
- `dw_dim_vendedor`
- `dw_dim_zona`
- `dw_fact_ventas`
- `dw_fact_costos_producto`
- `dw_fact_inventario_saldos`
- `dw_fact_produccion_plan_real`
- `dw_fact_otif`
- `dw_fact_forecast_real`
- `dw_fact_alertas_gerenciales`

Datamarts sugeridos:

- `dm_bi_executive_360`
- `dm_bi_profitability`
- `dm_bi_managerial_alerts`
- `dm_bi_commercial_performance`
- `dm_bi_strategic_clients`
- `dm_bi_demand_vs_forecast`

## Que queda mock en frontend

- Respuestas demo orientadas a El Arbolito.
- Metadata de Grafana con `dashboardUid`, sin URL real ni token.
- Facade y repositories API-ready sin consumir backend real mientras `environment.useBusinessIntelligenceMock` este activo.
- Sin dashboards Angular finales ni configuracion real de Grafana.
