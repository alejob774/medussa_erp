import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../../domain/models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../../domain/models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../../domain/models/executive-dashboard.model';
import { BiDashboardEmbedConfig, BiDashboardKey, GrafanaDashboardConfig } from '../../domain/models/grafana-embed.model';
import { ManagerialAlert, ManagerialAlertsFilters, ManagerialAlertsResponse } from '../../domain/models/managerial-alerts.model';
import { ProductProfitabilityItem, ProfitabilityFilters, ProfitabilityProductLineResponse } from '../../domain/models/profitability.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../../domain/models/strategic-clients.model';
import { BusinessIntelligenceRepository } from '../../domain/repositories/business-intelligence.repository';

const DEMO_COMPANY_ID = 'medussa-holding';

@Injectable({
  providedIn: 'root',
})
export class BusinessIntelligenceMockRepository implements BusinessIntelligenceRepository {
  getExecutiveDashboard(
    companyId: string,
    filters: ExecutiveDashboardFilters,
  ): Observable<ExecutiveDashboard360Response> {
    const normalized = this.withCompany(companyId, filters);

    return of<ExecutiveDashboard360Response>({
      filters: normalized,
      ventasMes: { valor: 486_200_000, unidad: 'COP', variacionPct: 8.4, estado: 'VERDE' },
      cumplimientoPresupuesto: { valor: 94.2, unidad: '%', variacionPct: -1.8, estado: 'AMARILLO' },
      produccionVsPlan: { valor: 97.6, unidad: '%', variacionPct: 2.1, estado: 'VERDE' },
      inventarioTotal: { valor: 1_184_000_000, unidad: 'COP', variacionPct: 4.9, estado: 'AMARILLO' },
      otif: { valor: 91.7, unidad: '%', variacionPct: 3.2, estado: 'VERDE' },
      margenEstimado: { valor: 27.8, unidad: '%', variacionPct: 1.4, estado: 'VERDE' },
      alertasCriticas: { valor: 5, unidad: 'alertas', variacionPct: -12.5, estado: 'ROJO' },
      alertas: [
        {
          id: `${companyId}-exec-alert-stock-yogurt`,
          mensaje: 'Stock critico proyectado para Yogurt bebible fresa 200 ml en canal TAT.',
          severidad: 'CRITICA',
          tipo: 'INVENTARIO',
          responsableSugerido: 'Jefatura SCM',
          estado: 'ABIERTA',
          fechaDeteccion: '2026-04-29',
          moduloOrigen: 'INVENTORY_CORE',
        },
        {
          id: `${companyId}-exec-alert-oee-linea-2`,
          mensaje: 'OEE bajo en linea de lacteos bebibles por microparadas repetidas.',
          severidad: 'ALTA',
          tipo: 'OEE',
          responsableSugerido: 'Lider de Produccion',
          estado: 'EN_GESTION',
          fechaDeteccion: '2026-04-28',
          moduloOrigen: 'OEE',
        },
        {
          id: `${companyId}-exec-alert-otif-sabana`,
          mensaje: 'OTIF bajo en zona Sabana por atrasos de alistamiento y ruta.',
          severidad: 'ALTA',
          tipo: 'OTIF',
          responsableSugerido: 'Coordinacion Logistica',
          estado: 'ABIERTA',
          fechaDeteccion: '2026-04-27',
          moduloOrigen: 'PICKING_PACKING',
        },
        {
          id: `${companyId}-exec-alert-budget-packaging`,
          mensaje: 'Desviacion de presupuesto en empaques flexibles por consumo mayor al plan.',
          severidad: 'MEDIA',
          tipo: 'PRESUPUESTO',
          responsableSugerido: 'Planeacion Financiera',
          estado: 'EN_GESTION',
          fechaDeteccion: '2026-04-26',
          moduloOrigen: 'BUDGET_MANAGEMENT',
        },
        {
          id: `${companyId}-exec-alert-margin-cheese`,
          mensaje: 'Margen bajo en Queso campesino 500 g por presion de costo variable.',
          severidad: 'ALTA',
          tipo: 'MARGEN',
          responsableSugerido: 'Gerencia Comercial',
          estado: 'ABIERTA',
          fechaDeteccion: '2026-04-25',
          moduloOrigen: 'COSTS_CORE',
        },
      ],
      tendencias: {
        ventas: this.trend([410, 438, 452, 471, 486.2]),
        margen: this.trend([25.2, 26.1, 26.8, 27.1, 27.8]),
        otif: this.trend([86.5, 88.1, 89.7, 90.2, 91.7]),
      },
      grafana: this.embed('executive-dashboard', normalized),
    }).pipe(delay(180));
  }

  getProfitability(
    companyId: string,
    filters: ProfitabilityFilters,
  ): Observable<ProfitabilityProductLineResponse> {
    const normalized = this.withCompany(companyId, filters);
    const ranking = this.profitabilityRanking();

    return of<ProfitabilityProductLineResponse>({
      filters: normalized,
      productoMasRentable: ranking[0],
      productoMenosRentable: ranking[ranking.length - 1],
      margenBrutoPromedio: 26.9,
      costosVariables: 298_600_000,
      costosIndirectos: 61_400_000,
      topRentables: ranking.slice(0, normalized.top ?? 3),
      topNoRentables: [...ranking].reverse().slice(0, normalized.top ?? 3),
      rankingProductos: ranking,
      grafana: this.embed('profitability', normalized),
    }).pipe(delay(180));
  }

  getManagerialAlerts(
    companyId: string,
    filters: ManagerialAlertsFilters,
  ): Observable<ManagerialAlertsResponse> {
    const normalized = this.withCompany(companyId, filters);
    const alertas = this.managerialAlerts(companyId).filter((alert) =>
      (!normalized.estado || normalized.estado === 'TODAS' || alert.estado === normalized.estado) &&
      (!normalized.severidad || normalized.severidad === 'TODAS' || alert.severidad === normalized.severidad) &&
      (!normalized.tipoAlerta || normalized.tipoAlerta === 'TODAS' || alert.tipoAlerta === normalized.tipoAlerta),
    );

    return of<ManagerialAlertsResponse>({
      filters: normalized,
      alertas,
      resumenSemaforo: {
        rojas: alertas.filter((item) => item.severidad === 'ROJA').length,
        amarillas: alertas.filter((item) => item.severidad === 'AMARILLA').length,
        verdes: alertas.filter((item) => item.severidad === 'VERDE').length,
      },
      totalAbiertas: alertas.filter((item) => item.estado === 'ABIERTA').length,
      totalRojas: alertas.filter((item) => item.severidad === 'ROJA').length,
      totalAmarillas: alertas.filter((item) => item.severidad === 'AMARILLA').length,
      totalVerdes: alertas.filter((item) => item.severidad === 'VERDE').length,
      grafana: this.embed('managerial-alerts', normalized),
    }).pipe(delay(180));
  }

  getCommercialPerformance(
    companyId: string,
    filters: CommercialPerformanceFilters,
  ): Observable<CommercialPerformanceResponse> {
    const normalized = this.withCompany(companyId, filters);

    return of<CommercialPerformanceResponse>({
      filters: normalized,
      ventasDia: 18_400_000,
      ventasMes: 486_200_000,
      cumplimientoMeta: 94.2,
      ticketPromedio: 1_280_000,
      conversionComercial: 38.6,
      topVendedores: [
        { id: 'ven-001', nombre: 'Carolina Mejia', valor: 126_800_000, variacionPct: 11.2 },
        { id: 'ven-002', nombre: 'Andres Rubio', valor: 98_300_000, variacionPct: 6.5 },
        { id: 'ven-003', nombre: 'Natalia Gomez', valor: 86_900_000, variacionPct: 4.1 },
      ],
      ventasPorZona: [
        { zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', ventas: 172_000_000, cumplimientoMetaPct: 97.5 },
        { zonaId: 'sabana', zonaNombre: 'Sabana', ventas: 141_500_000, cumplimientoMetaPct: 92.4 },
        { zonaId: 'centro', zonaNombre: 'Centro', ventas: 119_300_000, cumplimientoMetaPct: 88.7 },
      ],
      topClientes: [
        { id: 'cli-001', nombre: 'Distribuidora Santa Clara', valor: 72_600_000, variacionPct: 9.6 },
        { id: 'cli-002', nombre: 'Supermercados La Colina', valor: 65_100_000, variacionPct: 5.2 },
        { id: 'cli-003', nombre: 'Autoservicio El Prado', valor: 41_800_000, variacionPct: -1.1 },
      ],
      grafana: this.embed('commercial-performance', normalized),
    }).pipe(delay(180));
  }

  getStrategicClients(
    companyId: string,
    filters: StrategicClientsFilters,
  ): Observable<StrategicClientsResponse> {
    const normalized = this.withCompany(companyId, filters);

    return of<StrategicClientsResponse>({
      filters: normalized,
      topClientes: [
        { id: 'cli-001', nombre: 'Distribuidora Santa Clara', valor: 72_600_000, variacionPct: 9.6 },
        { id: 'cli-002', nombre: 'Supermercados La Colina', valor: 65_100_000, variacionPct: 5.2 },
        { id: 'cli-004', nombre: 'Mayorista Los Andes', valor: 39_400_000, variacionPct: 13.8 },
      ],
      clientesInactivos: [
        { clienteId: 'cli-011', clienteNombre: 'Tienda La Esperanza', diasInactivo: 46, ultimaCompra: '2026-03-12', ventasUltimoPeriodo: 2_400_000 },
        { clienteId: 'cli-017', clienteNombre: 'Mini Market San Luis', diasInactivo: 39, ultimaCompra: '2026-03-19', ventasUltimoPeriodo: 1_850_000 },
      ],
      crecimientoClientes: [
        { fecha: '2026-01', clientesNuevos: 8, clientesActivos: 124, clientesPerdidos: 3 },
        { fecha: '2026-02', clientesNuevos: 11, clientesActivos: 132, clientesPerdidos: 4 },
        { fecha: '2026-03', clientesNuevos: 9, clientesActivos: 137, clientesPerdidos: 2 },
        { fecha: '2026-04', clientesNuevos: 7, clientesActivos: 141, clientesPerdidos: 3 },
      ],
      concentracionVentasTop5: 36.4,
      concentracionVentasTop10: 54.7,
      ticketPromedioCliente: 1_280_000,
      frecuenciaCompra: 2.8,
      grafana: this.embed('strategic-clients', normalized),
    }).pipe(delay(180));
  }

  getDemandVsForecast(
    companyId: string,
    filters: DemandVsForecastFilters,
  ): Observable<DemandVsForecastResponse> {
    const normalized = this.withCompany(companyId, filters);

    return of<DemandVsForecastResponse>({
      filters: normalized,
      forecastTotal: 238_000,
      ventaReal: 226_400,
      desviacionAbsoluta: 11_600,
      errorForecastPct: 4.9,
      precisionPct: 95.1,
      subestimados: [
        { productoId: 'prod-arb-001', sku: 'ARB-YOG-200-FR', productoNombre: 'Yogurt bebible fresa 200 ml', forecast: 72_000, ventaReal: 78_400, desviacion: 6_400, errorForecastPct: 8.9 },
      ],
      sobrestimados: [
        { productoId: 'prod-arb-002', sku: 'ARB-QUE-500', productoNombre: 'Queso campesino 500 g', forecast: 42_000, ventaReal: 37_200, desviacion: -4_800, errorForecastPct: 11.4 },
      ],
      tendenciaForecastReal: [
        { fecha: '2026-01', valor: 214_000, comparativo: 208_500 },
        { fecha: '2026-02', valor: 221_000, comparativo: 219_200 },
        { fecha: '2026-03', valor: 230_000, comparativo: 225_800 },
        { fecha: '2026-04', valor: 238_000, comparativo: 226_400 },
      ],
      grafana: this.embed('demand-vs-forecast', normalized),
    }).pipe(delay(180));
  }

  getGrafanaDashboards(_companyId: string): Observable<GrafanaDashboardConfig[]> {
    return of(this.grafanaCatalog()).pipe(delay(120));
  }

  private grafanaCatalog(): GrafanaDashboardConfig[] {
    return [
      { dashboardKey: 'executive-dashboard', dashboardUid: 'medussa-exec-360', title: 'HU-033 Dashboard Ejecutivo 360', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.executive.view' },
      { dashboardKey: 'profitability', dashboardUid: 'medussa-profitability', title: 'HU-034 Rentabilidad Producto / Linea', datasource: 'datamart', refreshInterval: '1h', requiredPermission: 'bi.profitability.view' },
      { dashboardKey: 'managerial-alerts', dashboardUid: 'medussa-alerts', title: 'HU-035 Alertas Gerenciales', datasource: 'datamart', refreshInterval: '5m', requiredPermission: 'bi.alerts.view' },
      { dashboardKey: 'commercial-performance', dashboardUid: 'medussa-commercial', title: 'HU-036 Ventas y Cumplimiento Comercial', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.commercial.view' },
      { dashboardKey: 'strategic-clients', dashboardUid: 'medussa-clients', title: 'HU-037 Clientes Estrategicos', datasource: 'datamart', refreshInterval: '30m', requiredPermission: 'bi.clients.view' },
      { dashboardKey: 'demand-vs-forecast', dashboardUid: 'medussa-demand-forecast', title: 'HU-038 Demanda vs Forecast', datasource: 'datamart', refreshInterval: '30m', requiredPermission: 'bi.forecast.view' },
    ];
  }

  private embed(dashboardKey: BiDashboardKey, filters: { empresaId?: string | null; fechaDesde: string; fechaHasta: string }): BiDashboardEmbedConfig {
    const dashboard = this.grafanaCatalog().find((item) => item.dashboardKey === dashboardKey);

    return {
      dashboardKey,
      dashboardUid: dashboard?.dashboardUid ?? dashboardKey,
      dashboardUrl: null,
      iframeAllowed: false,
      filters,
    };
  }

  private withCompany<TFilters extends { empresaId?: string | null; fechaDesde: string; fechaHasta: string }>(
    companyId: string,
    filters: TFilters,
  ): TFilters {
    return {
      ...filters,
      empresaId: companyId || filters.empresaId || DEMO_COMPANY_ID,
    };
  }

  private trend(values: number[]) {
    return values.map((valor, index) => ({
      fecha: `2026-${String(index + 1).padStart(2, '0')}`,
      valor,
    }));
  }

  private profitabilityRanking(): ProductProfitabilityItem[] {
    return [
      { productoId: 'prod-arb-001', sku: 'ARB-YOG-200-FR', productoNombre: 'Yogurt bebible fresa 200 ml', lineaProductoId: 'lacteos-bebibles', lineaProductoNombre: 'Lacteos bebibles', ventas: 178_200_000, costoVentas: 109_600_000, margenBruto: 68_600_000, margenBrutoPct: 38.5 },
      { productoId: 'prod-arb-003', sku: 'ARB-UHT-1L', productoNombre: 'Leche entera UHT 1L', lineaProductoId: 'uht', lineaProductoNombre: 'UHT', ventas: 142_800_000, costoVentas: 101_200_000, margenBruto: 41_600_000, margenBrutoPct: 29.1 },
      { productoId: 'prod-arb-002', sku: 'ARB-QUE-500', productoNombre: 'Queso campesino 500 g', lineaProductoId: 'quesos', lineaProductoNombre: 'Quesos', ventas: 96_400_000, costoVentas: 77_900_000, margenBruto: 18_500_000, margenBrutoPct: 19.2 },
    ];
  }

  private managerialAlerts(companyId: string): ManagerialAlert[] {
    return [
      { id: `${companyId}-bi-alert-001`, empresaId: companyId, titulo: 'Margen bajo en queso campesino', descripcion: 'La linea de quesos opera por debajo del margen esperado.', tipoAlerta: 'MARGEN', severidad: 'ROJA', estado: 'ABIERTA', fechaDeteccion: '2026-04-24', moduloOrigen: 'COSTS_CORE', entidadId: 'prod-arb-002', grafanaPanelUid: 'margin-risk' },
      { id: `${companyId}-bi-alert-002`, empresaId: companyId, titulo: 'Forecast subestima yogurt fresa', descripcion: 'Demanda real supera forecast en el ultimo corte.', tipoAlerta: 'FORECAST', severidad: 'AMARILLA', estado: 'EN_GESTION', fechaDeteccion: '2026-04-25', moduloOrigen: 'DEMAND_ANALYSIS', entidadId: 'prod-arb-001', grafanaPanelUid: 'forecast-error' },
      { id: `${companyId}-bi-alert-003`, empresaId: companyId, titulo: 'OTIF recuperado en Bogota Norte', descripcion: 'La zona mantiene cumplimiento logístico controlado.', tipoAlerta: 'VENTAS', severidad: 'VERDE', estado: 'CERRADA', fechaDeteccion: '2026-04-22', moduloOrigen: 'PICKING_PACKING', entidadId: 'bogota-norte', grafanaPanelUid: 'otif-zone' },
    ];
  }
}
