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
- `bi.operations.production-rt.view`: HU-039 Produccion Tiempo Real.
- `bi.operations.oee.view`: HU-040 OEE Consolidado Planta.
- `bi.operations.quality.view`: HU-041 Calidad y No Conformidades.
- `bi.supply.inventory.view`: HU-042 Inventario Estrategico.
- `bi.supply.purchases.view`: HU-043 Compras Estrategicas.
- `bi.supply.logistics.view`: HU-044 KPI Logisticos.

## DashboardUid esperados

- HU-033: `medussa-executive`.
- HU-034: `medussa-profitability`.
- HU-035: `medussa-alerts`.
- HU-036: `medussa-commercial`.
- HU-037: `medussa-clients`.
- HU-038: `medussa-forecast`.
- HU-039: `medussa-production-rt`.
- HU-040: `medussa-oee-plant`.
- HU-041: `medussa-quality-nc`.
- HU-042: `medussa-inventory-strategic`.
- HU-043: `medussa-purchases-strategic`.
- HU-044: `medussa-logistics-kpi`.

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

Permiso: `bi.executive.view`.
Refresh esperado: 15 minutos.
Tabla DW/datamart sugerida: `dm_bi_executive_360`, alimentado desde `dw_fact_ventas`, `dw_fact_produccion_plan_real`, `dw_fact_inventario_saldos`, `dw_fact_otif`, `dw_fact_costos_producto` y `dw_fact_alertas_gerenciales`.
Dashboard Grafana: `medussa-executive`.

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

Permiso: `bi.profitability.view`.
Refresh esperado: 1 hora o al cierre de lote de Costos Core.
Tabla DW/datamart sugerida: `dm_bi_profitability`, alimentado desde `dw_fact_costos_producto`, `dw_fact_ventas`, `dw_dim_producto` y `dw_dim_linea_producto`.
Dashboard Grafana: `medussa-profitability`.

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
  grafana?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.alerts.view`.
Refresh esperado: 5 minutos.
Tabla DW/datamart sugerida: `dm_bi_managerial_alerts`, alimentado desde `dw_fact_alertas_gerenciales` y dimensiones operativas autorizadas.
Dashboard Grafana: `medussa-alerts`.

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

Permiso: `bi.commercial.view`.
Refresh esperado: 15 minutos.
Tabla DW/datamart sugerida: `dm_bi_commercial_performance`, alimentado desde `dw_fact_ventas`, `dw_dim_vendedor`, `dw_dim_zona` y `dw_dim_cliente`.
Dashboard Grafana: `medussa-commercial`.

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

Permiso: `bi.clients.view`.
Refresh esperado: 30 minutos.
Tabla DW/datamart sugerida: `dm_bi_strategic_clients`, alimentado desde `dw_fact_ventas`, `dw_dim_cliente`, `dw_dim_vendedor` y `dw_dim_zona`.
Dashboard Grafana: `medussa-clients`.

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

Permiso: `bi.forecast.view`.
Refresh esperado: 30 minutos o al aprobar forecast.
Tabla DW/datamart sugerida: `dm_bi_demand_vs_forecast`, alimentado desde `dw_fact_forecast_real`, `dw_fact_ventas`, `dw_dim_producto`, `dw_dim_linea_producto` y `dw_dim_zona`.
Dashboard Grafana: `medussa-forecast`.

### HU-039 Produccion Tiempo Real

`GET /api/v1/bi/produccion-tiempo-real`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `sedeId`
- `lineaId`
- `turnoId`

Respuesta:

```ts
{
  filters: ProductionRealtimeFilters;
  produccionHoy: number;
  ordenesAbiertas: number;
  cumplimientoPlanPct: number;
  unidadesPorLinea: ProductionLineStatus[];
  paradasActivas: ActiveDowntime[];
  tiempoDetenidoMin: number;
  eficienciaPorLinea: ProductionLineStatus[];
  produccionHora: ProductionHourlyPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.operations.production-rt.view`.
Refresh esperado: 1 minuto.
Tabla DW/datamart sugerida: `dm_bi_production_realtime`, alimentado desde `dw_fact_produccion_plan_real`, `dw_fact_paradas_produccion` y `dw_dim_linea_produccion`.
Dashboard Grafana: `medussa-production-rt`.

### HU-040 OEE Consolidado Planta

`GET /api/v1/bi/oee-consolidado-planta`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `sedeId`
- `lineaId`
- `turnoId`

Respuesta:

```ts
{
  filters: OeePlantFilters;
  oeeTotal: number;
  disponibilidad: number;
  rendimiento: number;
  calidad: number;
  oeePorLinea: OeeByLine[];
  oeePorTurno: OeeByShift[];
  tendenciaHistorica: OeeTrendPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.operations.oee.view`.
Refresh esperado: 5 minutos.
Tabla DW/datamart sugerida: `dm_bi_oee_plant`, alimentado desde `dw_fact_oee`, `dw_fact_paradas_produccion` y `dw_dim_turno`.
Dashboard Grafana: `medussa-oee-plant`.

### HU-041 Calidad y No Conformidades

`GET /api/v1/bi/calidad-no-conformidades`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `sedeId`
- `lineaId`
- `productoId`
- `tipoEvento`

Respuesta:

```ts
{
  filters: QualityNonconformityFilters;
  lotesRechazados: number;
  reclamosCliente: number;
  scrapKg: number;
  retrabajos: number;
  costoMalaCalidad: number;
  causasTop: QualityCausePareto[];
  eventosRecientes: QualityEventSummary[];
  tendenciaMensual: QualityTrendPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.operations.quality.view`.
Refresh esperado: 15 minutos o al cierre de inspeccion/calidad.
Tabla DW/datamart sugerida: `dm_bi_quality_nonconformities`, alimentado desde `dw_fact_calidad_eventos`, `dw_fact_scrap` y `dw_dim_causa_calidad`.
Dashboard Grafana: `medussa-quality-nc`.

### HU-042 Inventario Estrategico

`GET /api/v1/bi/inventario-estrategico`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `sedeId`
- `bodegaId`
- `lineaId`
- `clasificacionAbc`

Respuesta:

```ts
{
  filters: StrategicInventoryFilters;
  stockActual: number;
  rotacionPromedio: number;
  inventarioLento: number;
  sobreinventario: number;
  quiebres: number;
  valorInventario: number;
  coberturaDias: number;
  topSkuCriticos: CriticalSku[];
  agingInventario: InventoryAgingItem[];
  inventarioPorBodega: InventoryWarehouseSummary[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.supply.inventory.view`.
Refresh esperado: 15 minutos o al cierre de movimientos de Inventory Core.
Tabla DW/datamart sugerida: `dm_bi_strategic_inventory`, alimentado desde `dw_fact_inventario_saldos`, `dw_fact_inventario_movimientos` y `dw_dim_bodega`.
Dashboard Grafana: `medussa-inventory-strategic`.

### HU-043 Compras Estrategicas

`GET /api/v1/bi/compras-estrategicas`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `categoriaId`
- `proveedorId`
- `moneda`

Respuesta:

```ts
{
  filters: StrategicPurchasingFilters;
  ahorrosCompras: number;
  proveedorMasCostoso: SupplierRanking | null;
  leadTimePromedioDias: number;
  comprasUrgentes: number;
  variacionPreciosPct: number;
  rankingProveedores: SupplierRanking[];
  tendenciaPrecios: PriceVariationItem[];
  cumplimientoProveedores: SupplierComplianceItem[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.supply.purchases.view`.
Refresh esperado: 1 hora o al cierre de ordenes/recepciones de compra.
Tabla DW/datamart sugerida: `dm_bi_strategic_purchasing`, alimentado desde `dw_fact_compras`, `dw_fact_recepciones_compra`, `dw_fact_variacion_precios` y `dw_dim_proveedor`.
Dashboard Grafana: `medussa-purchases-strategic`.

### HU-044 KPI Logisticos

`GET /api/v1/bi/kpi-logisticos`

Filtros:

- `empresaId`
- `fechaDesde`
- `fechaHasta`
- `zonaId`
- `rutaId`
- `conductorId`

Respuesta:

```ts
{
  filters: LogisticsKpiFilters;
  costoTransporte: number;
  costoPorPedido: number;
  pedidosPorRuta: number;
  entregasPorConductor: number;
  utilizacionFlota: number;
  kmRecorridos: number;
  puntualidadEntrega: number;
  rankingRutas: RoutePerformance[];
  rankingConductores: DriverPerformance[];
  flota: FleetUtilization[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
```

Permiso: `bi.supply.logistics.view`.
Refresh esperado: 15 minutos o al cierre de ruta/picking-packing.
Tabla DW/datamart sugerida: `dm_bi_logistics_kpi`, alimentado desde `dw_fact_despachos`, `dw_fact_rutas`, `dw_fact_entregas` y `dw_dim_conductor`.
Dashboard Grafana: `medussa-logistics-kpi`.

Nota para HU-039 a HU-044: Grafana debe consultar DW/datamarts autorizados, no tablas transaccionales del ERP. El backend entrega metadata y datos agregados para Medussa ERP; no debe exponer tokens ni URLs de embedding sin validacion de empresa y permiso.

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
- `dw_dim_linea_produccion`
- `dw_dim_turno`
- `dw_dim_bodega`
- `dw_dim_proveedor`
- `dw_dim_conductor`
- `dw_fact_ventas`
- `dw_fact_costos_producto`
- `dw_fact_inventario_saldos`
- `dw_fact_inventario_movimientos`
- `dw_fact_produccion_plan_real`
- `dw_fact_paradas_produccion`
- `dw_fact_oee`
- `dw_fact_calidad_eventos`
- `dw_fact_scrap`
- `dw_fact_compras`
- `dw_fact_recepciones_compra`
- `dw_fact_variacion_precios`
- `dw_fact_despachos`
- `dw_fact_rutas`
- `dw_fact_entregas`
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
- `dm_bi_production_realtime`
- `dm_bi_oee_plant`
- `dm_bi_quality_nonconformities`
- `dm_bi_strategic_inventory`
- `dm_bi_strategic_purchasing`
- `dm_bi_logistics_kpi`

## Que queda mock en frontend

- Respuestas demo orientadas a El Arbolito.
- Metadata de Grafana con `dashboardUid`, sin URL real ni token.
- Facade y repositories API-ready sin consumir backend real mientras `environment.useBusinessIntelligenceMock` este activo.
- Sin dashboards JSON de Grafana, embedding real, tokens ni configuracion real de Grafana.
