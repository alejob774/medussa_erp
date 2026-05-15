import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../../domain/models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../../domain/models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../../domain/models/executive-dashboard.model';
import { BiDashboardEmbedConfig, BiDashboardKey, GrafanaDashboardConfig } from '../../domain/models/grafana-embed.model';
import { LogisticsKpiFilters, LogisticsKpiResponse } from '../../domain/models/logistics-kpi.model';
import { ManagerialAlert, ManagerialAlertsFilters, ManagerialAlertsResponse } from '../../domain/models/managerial-alerts.model';
import { OeePlantFilters, OeePlantResponse } from '../../domain/models/oee-plant.model';
import { ProductProfitabilityItem, ProfitabilityFilters, ProfitabilityProductLineResponse } from '../../domain/models/profitability.model';
import { ProductionRealtimeFilters, ProductionRealtimeResponse } from '../../domain/models/production-realtime.model';
import { QualityNonconformityFilters, QualityNonconformityResponse } from '../../domain/models/quality-nonconformity.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../../domain/models/strategic-clients.model';
import { StrategicInventoryFilters, StrategicInventoryResponse } from '../../domain/models/strategic-inventory.model';
import { StrategicPurchasingFilters, StrategicPurchasingResponse } from '../../domain/models/strategic-purchasing.model';
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
    const ranking = this.profitabilityRanking().filter(
      (item) =>
        (!normalized.lineaProductoId || item.lineaProductoId === normalized.lineaProductoId) &&
        (!normalized.productoId || item.productoId === normalized.productoId),
    );
    const top = normalized.top ?? 3;
    const costosVariables = ranking.reduce((sum, item) => sum + item.costoVariable, 0);
    const costosIndirectos = ranking.reduce((sum, item) => sum + item.costoIndirecto, 0);
    const utilidadEstimadaTotal = ranking.reduce((sum, item) => sum + item.utilidad, 0);
    const ventasTotales = ranking.reduce((sum, item) => sum + item.ventas, 0);
    const rentabilidadLineas = this.profitabilityLineSummary(ranking, ventasTotales);
    const topRentables = [...ranking].sort((left, right) => right.margenBrutoPct - left.margenBrutoPct);
    const topNoRentables = [...ranking].sort((left, right) => left.margenBrutoPct - right.margenBrutoPct);

    return of<ProfitabilityProductLineResponse>({
      filters: normalized,
      productoMasRentable: topRentables[0] ?? null,
      productoMenosRentable: topNoRentables[0] ?? null,
      margenBrutoPromedio: ventasTotales ? Number(((utilidadEstimadaTotal / ventasTotales) * 100).toFixed(1)) : 0,
      costosVariables,
      costosIndirectos,
      utilidadEstimadaTotal,
      topRentables: topRentables.slice(0, top),
      topNoRentables: topNoRentables.slice(0, top),
      rentabilidadLineas,
      rankingProductos: topRentables,
      lecturaEjecutiva: [
        {
          titulo: 'Lacteos bebibles sostiene la mayor contribucion',
          descripcion: 'Yogurt y kumis combinan buena rotacion, costo variable controlado y margen superior al promedio.',
          severidad: 'POSITIVA',
        },
        {
          titulo: 'Quesos requiere seguimiento de costo',
          descripcion: 'Queso campesino y cuajada absorben mayor costo indirecto y presion de materia prima.',
          severidad: 'SEGUIMIENTO',
        },
        {
          titulo: 'Avena UHT opera cerca del umbral minimo',
          descripcion: 'El margen bajo sugiere revisar precio de venta, empaque y eficiencia de lote antes de escalar volumen.',
          severidad: 'CRITICA',
        },
      ],
      grafana: this.embed('profitability', normalized),
    }).pipe(delay(180));
  }

  getManagerialAlerts(
    companyId: string,
    filters: ManagerialAlertsFilters,
  ): Observable<ManagerialAlertsResponse> {
    const normalized = this.withCompany(companyId, filters);
    const alertas = this.executiveManagerialAlerts(companyId).filter((alert) =>
      (!normalized.estado || normalized.estado === 'TODAS' || alert.estado === normalized.estado) &&
      (!normalized.severidad || normalized.severidad === 'TODAS' || alert.severidad === normalized.severidad) &&
      (!normalized.tipoAlerta || normalized.tipoAlerta === 'TODAS' || alert.tipoAlerta === normalized.tipoAlerta) &&
      (!normalized.sedeId || alert.sedeId === normalized.sedeId) &&
      (!normalized.fechaDesde || alert.fechaDeteccion >= normalized.fechaDesde) &&
      (!normalized.fechaHasta || alert.fechaDeteccion <= normalized.fechaHasta),
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
    const sellers = [
      { vendedorId: 'ven-001', vendedorNombre: 'Carolina Mejia', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', ventas: 126_800_000, meta: 120_000_000, cumplimientoMetaPct: 105.7, pedidos: 92, ticketPromedio: 1_378_261 },
      { vendedorId: 'ven-002', vendedorNombre: 'Andres Rubio', zonaId: 'sabana', zonaNombre: 'Sabana', ventas: 98_300_000, meta: 104_000_000, cumplimientoMetaPct: 94.5, pedidos: 76, ticketPromedio: 1_293_421 },
      { vendedorId: 'ven-003', vendedorNombre: 'Natalia Gomez', zonaId: 'centro', zonaNombre: 'Centro', ventas: 86_900_000, meta: 96_000_000, cumplimientoMetaPct: 90.5, pedidos: 71, ticketPromedio: 1_223_944 },
      { vendedorId: 'ven-004', vendedorNombre: 'Felipe Torres', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', ventas: 74_700_000, meta: 72_000_000, cumplimientoMetaPct: 103.8, pedidos: 54, ticketPromedio: 1_383_333 },
    ].filter((item) => (!normalized.zonaId || item.zonaId === normalized.zonaId) && (!normalized.vendedorId || item.vendedorId === normalized.vendedorId));
    const zones = [
      { zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', ventas: 201_500_000, meta: 192_000_000, cumplimientoMetaPct: 104.9, pedidos: 146 },
      { zonaId: 'sabana', zonaNombre: 'Sabana', ventas: 141_500_000, meta: 153_000_000, cumplimientoMetaPct: 92.5, pedidos: 109 },
      { zonaId: 'centro', zonaNombre: 'Centro', ventas: 119_300_000, meta: 134_500_000, cumplimientoMetaPct: 88.7, pedidos: 98 },
    ].filter((item) => !normalized.zonaId || item.zonaId === normalized.zonaId);
    const clients = [
      { clienteId: 'cli-001', clienteNombre: 'Distribuidora Santa Clara', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', vendedorId: 'ven-001', vendedorNombre: 'Carolina Mejia', ventas: 72_600_000, pedidos: 28, ticketPromedio: 2_592_857 },
      { clienteId: 'cli-002', clienteNombre: 'Supermercados La Colina', zonaId: 'sabana', zonaNombre: 'Sabana', vendedorId: 'ven-002', vendedorNombre: 'Andres Rubio', ventas: 65_100_000, pedidos: 24, ticketPromedio: 2_712_500 },
      { clienteId: 'cli-003', clienteNombre: 'Autoservicio El Prado', zonaId: 'centro', zonaNombre: 'Centro', vendedorId: 'ven-003', vendedorNombre: 'Natalia Gomez', ventas: 41_800_000, pedidos: 21, ticketPromedio: 1_990_476 },
      { clienteId: 'cli-004', clienteNombre: 'Mayorista Los Andes', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', vendedorId: 'ven-004', vendedorNombre: 'Felipe Torres', ventas: 39_400_000, pedidos: 18, ticketPromedio: 2_188_889 },
    ].filter(
      (item) =>
        (!normalized.zonaId || item.zonaId === normalized.zonaId) &&
        (!normalized.vendedorId || item.vendedorId === normalized.vendedorId) &&
        (!normalized.clienteId || item.clienteId === normalized.clienteId),
    );
    const ventasMes = sellers.reduce((sum, item) => sum + item.ventas, 0);
    const metaMes = sellers.reduce((sum, item) => sum + item.meta, 0);
    const pedidos = sellers.reduce((sum, item) => sum + item.pedidos, 0);

    return of<CommercialPerformanceResponse>({
      filters: normalized,
      ventasDia: Math.round(ventasMes * 0.038),
      ventasMes,
      cumplimientoMeta: metaMes ? Number(((ventasMes / metaMes) * 100).toFixed(1)) : 0,
      ticketPromedio: pedidos ? Math.round(ventasMes / pedidos) : 0,
      conversionComercial: normalized.zonaId === 'centro' ? 33.8 : 38.6,
      topVendedores: sellers.sort((left, right) => right.ventas - left.ventas),
      ventasPorZona: zones,
      topClientes: clients.sort((left, right) => right.ventas - left.ventas),
      grafana: this.embed('commercial-performance', normalized),
    }).pipe(delay(180));
  }

  getStrategicClients(
    companyId: string,
    filters: StrategicClientsFilters,
  ): Observable<StrategicClientsResponse> {
    const normalized = this.withCompany(companyId, filters);
    const topClientes = [
      { clienteId: 'cli-001', clienteNombre: 'Distribuidora Santa Clara', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', vendedorId: 'ven-001', vendedorNombre: 'Carolina Mejia', ventas: 72_600_000, pedidos: 28, ticketPromedio: 2_592_857, frecuenciaCompra: 3.6, participacionPct: 14.9, clasificacion: 'CLAVE' as const },
      { clienteId: 'cli-002', clienteNombre: 'Supermercados La Colina', zonaId: 'sabana', zonaNombre: 'Sabana', vendedorId: 'ven-002', vendedorNombre: 'Andres Rubio', ventas: 65_100_000, pedidos: 24, ticketPromedio: 2_712_500, frecuenciaCompra: 3.1, participacionPct: 13.4, clasificacion: 'CLAVE' as const },
      { clienteId: 'cli-004', clienteNombre: 'Mayorista Los Andes', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', vendedorId: 'ven-004', vendedorNombre: 'Felipe Torres', ventas: 39_400_000, pedidos: 18, ticketPromedio: 2_188_889, frecuenciaCompra: 2.7, participacionPct: 8.1, clasificacion: 'CRECIMIENTO' as const },
      { clienteId: 'cli-003', clienteNombre: 'Autoservicio El Prado', zonaId: 'centro', zonaNombre: 'Centro', vendedorId: 'ven-003', vendedorNombre: 'Natalia Gomez', ventas: 41_800_000, pedidos: 21, ticketPromedio: 1_990_476, frecuenciaCompra: 2.4, participacionPct: 8.6, clasificacion: 'RIESGO' as const },
      { clienteId: 'cli-005', clienteNombre: 'Mercados Don Rafael', zonaId: 'centro', zonaNombre: 'Centro', vendedorId: 'ven-003', vendedorNombre: 'Natalia Gomez', ventas: 28_900_000, pedidos: 16, ticketPromedio: 1_806_250, frecuenciaCompra: 2.2, participacionPct: 5.9, clasificacion: 'OPORTUNIDAD' as const },
      { clienteId: 'cli-006', clienteNombre: 'Tienda La Esperanza', zonaId: 'sabana', zonaNombre: 'Sabana', vendedorId: 'ven-002', vendedorNombre: 'Andres Rubio', ventas: 9_800_000, pedidos: 5, ticketPromedio: 1_960_000, frecuenciaCompra: 0.8, participacionPct: 2.0, clasificacion: 'INACTIVO' as const },
    ].filter(
      (item) =>
        (!normalized.zonaId || item.zonaId === normalized.zonaId) &&
        (!normalized.vendedorId || item.vendedorId === normalized.vendedorId) &&
        (!normalized.clienteId || item.clienteId === normalized.clienteId),
    );
    const clientesInactivos = [
      { clienteId: 'cli-006', clienteNombre: 'Tienda La Esperanza', vendedorId: 'ven-002', vendedorNombre: 'Andres Rubio', zonaId: 'sabana', zonaNombre: 'Sabana', diasInactivo: 46, ultimaCompra: '2026-03-15', ventasUltimoPeriodo: 2_400_000, ventasHistoricas: 48_600_000, accionSugerida: 'Agendar visita de recuperacion y validar surtido minimo.' },
      { clienteId: 'cli-007', clienteNombre: 'Mini Market San Luis', vendedorId: 'ven-004', vendedorNombre: 'Felipe Torres', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', diasInactivo: 63, ultimaCompra: '2026-02-26', ventasUltimoPeriodo: 1_850_000, ventasHistoricas: 36_200_000, accionSugerida: 'Ofrecer paquete de reactivacion con lacteos bebibles.' },
      { clienteId: 'cli-008', clienteNombre: 'Autoservicio La Pradera', vendedorId: 'ven-003', vendedorNombre: 'Natalia Gomez', zonaId: 'centro', zonaNombre: 'Centro', diasInactivo: 91, ultimaCompra: '2026-01-29', ventasUltimoPeriodo: 0, ventasHistoricas: 29_700_000, accionSugerida: 'Escalar a plan de retencion por riesgo de perdida.' },
    ].filter(
      (item) =>
        (!normalized.zonaId || item.zonaId === normalized.zonaId) &&
        (!normalized.vendedorId || item.vendedorId === normalized.vendedorId) &&
        (!normalized.clienteId || item.clienteId === normalized.clienteId),
    );
    const crecimientoClientes = [
      { clienteId: 'cli-001', clienteNombre: 'Distribuidora Santa Clara', ventasPeriodoActual: 72_600_000, ventasPeriodoAnterior: 66_240_000, crecimientoPct: 9.6, tendencia: 'CRECE' as const, oportunidadSugerida: 'Profundizar portafolio UHT y queso campesino.' },
      { clienteId: 'cli-002', clienteNombre: 'Supermercados La Colina', ventasPeriodoActual: 65_100_000, ventasPeriodoAnterior: 61_880_000, crecimientoPct: 5.2, tendencia: 'CRECE' as const, oportunidadSugerida: 'Negociar exhibicion secundaria para yogurt bebible.' },
      { clienteId: 'cli-003', clienteNombre: 'Autoservicio El Prado', ventasPeriodoActual: 41_800_000, ventasPeriodoAnterior: 42_260_000, crecimientoPct: -1.1, tendencia: 'ESTABLE' as const, oportunidadSugerida: 'Revisar frecuencia de visita y quiebres por SKU.' },
      { clienteId: 'cli-004', clienteNombre: 'Mayorista Los Andes', ventasPeriodoActual: 39_400_000, ventasPeriodoAnterior: 34_620_000, crecimientoPct: 13.8, tendencia: 'CRECE' as const, oportunidadSugerida: 'Convertir a cliente clave con meta mensual propia.' },
      { clienteId: 'cli-006', clienteNombre: 'Tienda La Esperanza', ventasPeriodoActual: 9_800_000, ventasPeriodoAnterior: 14_900_000, crecimientoPct: -34.2, tendencia: 'CAE' as const, oportunidadSugerida: 'Activar plan de recuperacion por inactividad.' },
    ].filter((item) => !normalized.clienteId || item.clienteId === normalized.clienteId);
    const ventas = topClientes.reduce((sum, item) => sum + item.ventas, 0);
    const pedidos = topClientes.reduce((sum, item) => sum + item.pedidos, 0);
    const frecuencia = topClientes.length
      ? Number((topClientes.reduce((sum, item) => sum + item.frecuenciaCompra, 0) / topClientes.length).toFixed(1))
      : 0;

    return of<StrategicClientsResponse>({
      filters: normalized,
      topClientes: topClientes.sort((left, right) => right.ventas - left.ventas),
      clientesInactivos,
      crecimientoClientes,
      concentracionVentasTop5: 36.4,
      concentracionVentasTop10: 54.7,
      ticketPromedioCliente: pedidos ? Math.round(ventas / pedidos) : 0,
      frecuenciaCompra: frecuencia,
      concentracion: {
        top5Pct: 36.4,
        top10Pct: 54.7,
        nivelRiesgo: 'MEDIO',
        lecturaEjecutiva: 'La cartera tiene concentracion sana para expansion, pero los dos primeros clientes explican una parte sensible del ingreso comercial.',
      },
      grafana: this.embed('strategic-clients', normalized),
    }).pipe(delay(180));
  }

  getDemandVsForecast(
    companyId: string,
    filters: DemandVsForecastFilters,
  ): Observable<DemandVsForecastResponse> {
    const normalized = this.withCompany(companyId, filters);
    const deviations = [
      { productoId: 'prod-arb-001', sku: 'ARB-YOG-200-FR', productoNombre: 'Yogurt bebible fresa 200 ml', lineaId: 'lacteos-bebibles', lineaNombre: 'Lacteos bebibles', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', forecast: 72_000, ventaReal: 78_400, desviacion: 6_400, errorForecastPct: 8.9, impactoEstimado: 8_320_000 },
      { productoId: 'prod-arb-003', sku: 'ARB-UHT-1L', productoNombre: 'Leche entera UHT 1L', lineaId: 'uht', lineaNombre: 'UHT', zonaId: 'sabana', zonaNombre: 'Sabana', forecast: 58_000, ventaReal: 62_100, desviacion: 4_100, errorForecastPct: 7.1, impactoEstimado: 5_330_000 },
      { productoId: 'prod-arb-004', sku: 'ARB-KUM-150', productoNombre: 'Kumis tradicional 150 g', lineaId: 'lacteos-bebibles', lineaNombre: 'Lacteos bebibles', zonaId: 'centro', zonaNombre: 'Centro', forecast: 31_000, ventaReal: 35_200, desviacion: 4_200, errorForecastPct: 13.5, impactoEstimado: 3_150_000 },
      { productoId: 'prod-arb-002', sku: 'ARB-QUE-500', productoNombre: 'Queso campesino 500 g', lineaId: 'quesos', lineaNombre: 'Quesos', zonaId: 'centro', zonaNombre: 'Centro', forecast: 42_000, ventaReal: 37_200, desviacion: -4_800, errorForecastPct: 11.4, impactoEstimado: 6_720_000 },
      { productoId: 'prod-arb-005', sku: 'ARB-AVN-1L', productoNombre: 'Avena UHT 1L', lineaId: 'uht', lineaNombre: 'UHT', zonaId: 'sabana', zonaNombre: 'Sabana', forecast: 35_000, ventaReal: 30_600, desviacion: -4_400, errorForecastPct: 12.6, impactoEstimado: 4_620_000 },
      { productoId: 'prod-arb-006', sku: 'ARB-CUA-450', productoNombre: 'Cuajada fresca 450 g', lineaId: 'quesos', lineaNombre: 'Quesos', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', forecast: 24_000, ventaReal: 22_900, desviacion: -1_100, errorForecastPct: 4.6, impactoEstimado: 1_870_000 },
    ].filter(
      (item) =>
        (!normalized.productoId || item.productoId === normalized.productoId) &&
        (!normalized.lineaId || item.lineaId === normalized.lineaId) &&
        (!normalized.zonaId || item.zonaId === normalized.zonaId),
    );
    const forecastTotal = deviations.reduce((sum, item) => sum + item.forecast, 0);
    const ventaReal = deviations.reduce((sum, item) => sum + item.ventaReal, 0);
    const desviacionAbsoluta = Math.abs(ventaReal - forecastTotal);
    const errorForecastPct = forecastTotal ? Number(((desviacionAbsoluta / forecastTotal) * 100).toFixed(1)) : 0;
    const precisionPct = Number(Math.max(0, 100 - errorForecastPct).toFixed(1));
    const precisionSegmentos = [
      { segmentoId: 'bogota-norte', segmentoNombre: 'Bogota Norte', tipoSegmento: 'ZONA' as const, forecast: 96_000, ventaReal: 101_300, precisionPct: 94.5, estado: 'ALTA' as const },
      { segmentoId: 'sabana', segmentoNombre: 'Sabana', tipoSegmento: 'ZONA' as const, forecast: 93_000, ventaReal: 92_700, precisionPct: 99.7, estado: 'ALTA' as const },
      { segmentoId: 'centro', segmentoNombre: 'Centro', tipoSegmento: 'ZONA' as const, forecast: 73_000, ventaReal: 72_400, precisionPct: 99.2, estado: 'ALTA' as const },
      { segmentoId: 'lacteos-bebibles', segmentoNombre: 'Lacteos bebibles', tipoSegmento: 'LINEA' as const, forecast: 103_000, ventaReal: 113_600, precisionPct: 89.7, estado: 'MEDIA' as const },
      { segmentoId: 'quesos', segmentoNombre: 'Quesos', tipoSegmento: 'LINEA' as const, forecast: 66_000, ventaReal: 60_100, precisionPct: 91.1, estado: 'ALTA' as const },
      { segmentoId: 'uht', segmentoNombre: 'UHT', tipoSegmento: 'LINEA' as const, forecast: 93_000, ventaReal: 92_700, precisionPct: 99.7, estado: 'ALTA' as const },
    ].filter(
      (item) =>
        (!normalized.zonaId || item.segmentoId === normalized.zonaId || item.tipoSegmento === 'LINEA') &&
        (!normalized.lineaId || item.segmentoId === normalized.lineaId || item.tipoSegmento === 'ZONA'),
    );

    return of<DemandVsForecastResponse>({
      filters: normalized,
      forecastTotal,
      ventaReal,
      desviacionAbsoluta,
      errorForecastPct,
      precisionPct,
      subestimados: deviations.filter((item) => item.ventaReal > item.forecast).sort((left, right) => right.desviacion - left.desviacion),
      sobrestimados: deviations.filter((item) => item.forecast > item.ventaReal).sort((left, right) => left.desviacion - right.desviacion),
      precisionSegmentos,
      lecturaEjecutiva: precisionPct >= 95
        ? 'La precision global del forecast es alta, con desviaciones localizadas que deben revisarse por linea y zona.'
        : 'La precision del forecast requiere seguimiento: hay riesgo combinado de quiebres por subestimacion y sobreinventario por sobrestimacion.',
      tendenciaForecastReal: [
        { fecha: '2026-01', valor: 214_000, comparativo: 208_500 },
        { fecha: '2026-02', valor: 221_000, comparativo: 219_200 },
        { fecha: '2026-03', valor: 230_000, comparativo: 225_800 },
        { fecha: '2026-04', valor: 238_000, comparativo: 226_400 },
      ],
      grafana: this.embed('demand-vs-forecast', normalized),
    }).pipe(delay(180));
  }

  getProductionRealtime(
    companyId: string,
    filters: ProductionRealtimeFilters,
  ): Observable<ProductionRealtimeResponse> {
    const normalized = this.withCompany(companyId, filters);
    const unidadesPorLinea = [
      { lineaId: 'linea-uht-1', lineaNombre: 'Linea UHT 1L', productoActual: 'Leche entera UHT 1L', ordenProduccionId: 'OP-ARB-2026-0418', unidadesPlan: 48_000, unidadesProducidas: 46_850, cumplimientoPlanPct: 97.6, eficienciaPct: 86.9, estado: 'VERDE' as const },
      { lineaId: 'linea-bebibles-2', lineaNombre: 'Linea lacteos bebibles', productoActual: 'Yogurt bebible fresa 200 ml', ordenProduccionId: 'OP-ARB-2026-0419', unidadesPlan: 72_000, unidadesProducidas: 66_400, cumplimientoPlanPct: 92.2, eficienciaPct: 78.4, estado: 'AMARILLO' as const },
      { lineaId: 'linea-quesos-1', lineaNombre: 'Linea quesos frescos', productoActual: 'Queso campesino 500 g', ordenProduccionId: 'OP-ARB-2026-0421', unidadesPlan: 18_500, unidadesProducidas: 17_920, cumplimientoPlanPct: 96.9, eficienciaPct: 82.1, estado: 'VERDE' as const },
      { lineaId: 'linea-empaque-1', lineaNombre: 'Linea empaque multipack', productoActual: 'Mix lacteos refrigerados', ordenProduccionId: 'OP-ARB-2026-0424', unidadesPlan: 25_000, unidadesProducidas: 21_700, cumplimientoPlanPct: 86.8, eficienciaPct: 74.6, estado: 'AMARILLO' as const },
    ].filter((item) => !normalized.lineaId || item.lineaId === normalized.lineaId);
    const paradasActivas = [
      { id: 'downtime-bebibles-mecanica', lineaId: 'linea-bebibles-2', lineaNombre: 'Linea lacteos bebibles', causa: 'Falla mecanica en valvula de llenado', inicio: '2026-05-05T10:18:00-05:00', duracionMin: 18, responsable: 'Mantenimiento turno A', severidad: 'MEDIA' as const },
      { id: 'downtime-quesos-limpieza', lineaId: 'linea-quesos-1', lineaNombre: 'Linea quesos frescos', causa: 'Limpieza sanitaria pendiente de liberacion', inicio: '2026-05-05T09:54:00-05:00', duracionMin: 12, responsable: 'Calidad planta', severidad: 'BAJA' as const },
      { id: 'downtime-empaque-material', lineaId: 'linea-empaque-1', lineaNombre: 'Linea empaque multipack', causa: 'Falta material de empaque secundario', inicio: '2026-05-05T10:31:00-05:00', duracionMin: 9, responsable: 'Coordinacion SCM', severidad: 'ALTA' as const },
    ].filter((item) => !normalized.lineaId || item.lineaId === normalized.lineaId);

    return of<ProductionRealtimeResponse>({
      filters: normalized,
      produccionHoy: unidadesPorLinea.reduce((sum, item) => sum + item.unidadesProducidas, 0),
      ordenesAbiertas: unidadesPorLinea.length + 4,
      cumplimientoPlanPct: 95.2,
      unidadesPorLinea,
      paradasActivas,
      tiempoDetenidoMin: paradasActivas.reduce((sum, item) => sum + item.duracionMin, 0),
      eficienciaPorLinea: [...unidadesPorLinea].sort((left, right) => right.eficienciaPct - left.eficienciaPct),
      produccionHora: [
        { fecha: '06:00', valor: 14_800, comparativo: 15_200, plan: 15_000 },
        { fecha: '07:00', valor: 16_300, comparativo: 15_900, plan: 16_000 },
        { fecha: '08:00', valor: 17_100, comparativo: 16_700, plan: 17_000 },
        { fecha: '09:00', valor: 15_950, comparativo: 17_200, plan: 17_000 },
        { fecha: '10:00', valor: 13_420, comparativo: 16_900, plan: 17_000 },
      ],
      grafanaEmbedConfig: this.embed('production-realtime', normalized),
    }).pipe(delay(180));
  }

  getOeePlant(companyId: string, filters: OeePlantFilters): Observable<OeePlantResponse> {
    const normalized = this.withCompany(companyId, filters);
    const oeePorLinea = [
      { lineaId: 'linea-uht-1', lineaNombre: 'Linea UHT 1L', oee: 84.6, disponibilidad: 91.2, rendimiento: 94.1, calidad: 98.5, estado: 'VERDE' as const },
      { lineaId: 'linea-bebibles-2', lineaNombre: 'Linea lacteos bebibles', oee: 72.8, disponibilidad: 83.7, rendimiento: 88.6, calidad: 98.1, estado: 'AMARILLO' as const },
      { lineaId: 'linea-quesos-1', lineaNombre: 'Linea quesos frescos', oee: 78.9, disponibilidad: 87.5, rendimiento: 91.2, calidad: 98.8, estado: 'VERDE' as const },
      { lineaId: 'linea-empaque-1', lineaNombre: 'Linea empaque multipack', oee: 69.7, disponibilidad: 80.4, rendimiento: 88.1, calidad: 98.5, estado: 'AMARILLO' as const },
    ].filter((item) => !normalized.lineaId || item.lineaId === normalized.lineaId);

    return of<OeePlantResponse>({
      filters: normalized,
      oeeTotal: 79.4,
      disponibilidad: 87.6,
      rendimiento: 91.3,
      calidad: 98.4,
      oeePorLinea,
      oeePorTurno: [
        { turnoId: 'MANANA', turnoNombre: 'MANANA', oee: 81.2, disponibilidad: 89.1, rendimiento: 92.6, calidad: 98.5 },
        { turnoId: 'TARDE', turnoNombre: 'TARDE', oee: 77.5, disponibilidad: 86.3, rendimiento: 90.4, calidad: 98.2 },
        { turnoId: 'NOCHE', turnoNombre: 'NOCHE', oee: 79.6, disponibilidad: 87.2, rendimiento: 91.1, calidad: 99.0 },
      ].filter((item) => !normalized.turnoId || item.turnoId === normalized.turnoId),
      tendenciaHistorica: [
        { fecha: '2026-01', valor: 75.8, disponibilidad: 84.6, rendimiento: 90.8, calidad: 98.7 },
        { fecha: '2026-02', valor: 77.1, disponibilidad: 86.0, rendimiento: 91.0, calidad: 98.5 },
        { fecha: '2026-03', valor: 78.6, disponibilidad: 87.2, rendimiento: 91.6, calidad: 98.3 },
        { fecha: '2026-04', valor: 79.4, disponibilidad: 87.6, rendimiento: 91.3, calidad: 98.4 },
      ],
      grafanaEmbedConfig: this.embed('oee-plant', normalized),
    }).pipe(delay(180));
  }

  getQualityNonconformities(
    companyId: string,
    filters: QualityNonconformityFilters,
  ): Observable<QualityNonconformityResponse> {
    const normalized = this.withCompany(companyId, filters);

    return of<QualityNonconformityResponse>({
      filters: normalized,
      lotesRechazados: 7,
      reclamosCliente: 14,
      scrapKg: 428,
      retrabajos: 9,
      costoMalaCalidad: 18_450_000,
      causasTop: [
        { causaId: 'materia-prima', causaNombre: 'Materia prima fuera de especificacion', eventos: 8, participacionPct: 28.6, costoEstimado: 5_900_000 },
        { causaId: 'maquina', causaNombre: 'Maquina / sellado fuera de especificacion', eventos: 6, participacionPct: 21.4, costoEstimado: 4_250_000 },
        { causaId: 'operador', causaNombre: 'Operador / ajuste de proceso', eventos: 5, participacionPct: 17.9, costoEstimado: 3_100_000 },
        { causaId: 'almacenamiento', causaNombre: 'Almacenamiento y vida util comprometida', eventos: 4, participacionPct: 14.3, costoEstimado: 2_850_000 },
        { causaId: 'transporte', causaNombre: 'Transporte / cadena de frio', eventos: 3, participacionPct: 10.7, costoEstimado: 1_650_000 },
        { causaId: 'empaque', causaNombre: 'Empaque secundario deteriorado', eventos: 2, participacionPct: 7.1, costoEstimado: 700_000 },
      ],
      eventosRecientes: [
        { eventoId: 'NC-2026-078', fecha: '2026-04-29', productoId: 'prod-arb-001', productoNombre: 'Yogurt bebible fresa 200 ml', lineaId: 'linea-bebibles-2', lineaNombre: 'Linea Yogurt', clienteId: null, clienteNombre: null, lote: 'YF-0429-A', tipo: 'RETRABAJO' as const, cantidad: 1_240, costoEstimado: 1_860_000, causa: 'Operador / ajuste de proceso', estado: 'EN_ANALISIS' as const },
        { eventoId: 'NC-2026-074', fecha: '2026-04-27', productoId: 'prod-arb-003', productoNombre: 'Leche entera UHT 1L', lineaId: 'linea-uht-1', lineaNombre: 'Linea UHT', clienteId: 'cli-002', clienteNombre: 'Supermercados La Colina', lote: 'UHT-0427-B', tipo: 'RECLAMO_CLIENTE' as const, cantidad: 320, costoEstimado: 960_000, causa: 'Transporte / cadena de frio', estado: 'ABIERTO' as const },
        { eventoId: 'NC-2026-069', fecha: '2026-04-24', productoId: 'prod-arb-002', productoNombre: 'Queso campesino 500 g', lineaId: 'linea-quesos-1', lineaNombre: 'Linea Quesos', clienteId: null, clienteNombre: null, lote: 'QC-0424-C', tipo: 'SCRAP' as const, cantidad: 88, costoEstimado: 1_340_000, causa: 'Materia prima fuera de especificacion', estado: 'CERRADO' as const },
        { eventoId: 'NC-2026-066', fecha: '2026-04-22', productoId: 'prod-arb-005', productoNombre: 'Avena UHT 1L', lineaId: 'linea-uht-1', lineaNombre: 'Linea UHT', clienteId: 'cli-001', clienteNombre: 'Distribuidora Santa Clara', lote: 'AV-0422-A', tipo: 'DEVOLUCION' as const, cantidad: 210, costoEstimado: 720_000, causa: 'Empaque secundario deteriorado', estado: 'CERRADO' as const },
        { eventoId: 'NC-2026-061', fecha: '2026-04-18', productoId: 'prod-arb-004', productoNombre: 'Kumis tradicional 150 g', lineaId: 'linea-bebibles-2', lineaNombre: 'Linea Yogurt', clienteId: null, clienteNombre: null, lote: 'KU-0418-C', tipo: 'RECHAZO_LOTE' as const, cantidad: 1_850, costoEstimado: 2_420_000, causa: 'Maquina / sellado fuera de especificacion', estado: 'CERRADO' as const },
      ].filter(
        (item) =>
          (!normalized.productoId || item.productoId === normalized.productoId) &&
          (!normalized.lineaId || item.lineaId === normalized.lineaId) &&
          (!normalized.clienteId || item.clienteId === normalized.clienteId) &&
          (!normalized.tipoEvento || item.tipo === normalized.tipoEvento),
      ),
      tendenciaMensual: [
        { fecha: '2026-01', valor: 22, reclamos: 11, scrapKg: 390, costoMalaCalidad: 15_200_000 },
        { fecha: '2026-02', valor: 25, reclamos: 13, scrapKg: 410, costoMalaCalidad: 16_800_000 },
        { fecha: '2026-03', valor: 21, reclamos: 10, scrapKg: 365, costoMalaCalidad: 14_900_000 },
        { fecha: '2026-04', valor: 30, reclamos: 14, scrapKg: 428, costoMalaCalidad: 18_450_000 },
      ],
      grafanaEmbedConfig: this.embed('quality-nonconformity', normalized),
    }).pipe(delay(180));
  }

  getStrategicInventory(
    companyId: string,
    filters: StrategicInventoryFilters,
  ): Observable<StrategicInventoryResponse> {
    const normalized = this.withCompany(companyId, filters);
    const topSkuCriticos = [
      { productoId: 'prod-arb-001', sku: 'ARB-YOG-200-FR', productoNombre: 'Yogurt bebible fresa 200 ml', categoriaId: 'cat-lacteos-bebibles', categoriaNombre: 'Lacteos bebibles', proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', bodegaId: 'bg-prod-terminado', bodegaNombre: 'Producto terminado', stockActual: 8_400, stockMinimo: 12_000, stockMaximo: 36_000, coberturaDias: 1.8, riesgo: 'QUIEBRE' as const, valorInventario: 18_480_000 },
      { productoId: 'prod-arb-005', sku: 'ARB-AVN-1L', productoNombre: 'Avena UHT 1L', categoriaId: 'cat-uht', categoriaNombre: 'UHT', proveedorId: 'sup-cultivos-pro', proveedorNombre: 'Cultivos Probioticos SAS', bodegaId: 'bg-prod-terminado', bodegaNombre: 'Producto terminado', stockActual: 31_200, stockMinimo: 14_000, stockMaximo: 24_000, coberturaDias: 24.6, riesgo: 'SOBREINVENTARIO' as const, valorInventario: 93_600_000 },
      { productoId: 'mat-empaque-200', sku: 'EMP-BOT-200', productoNombre: 'Botella PET 200 ml', categoriaId: 'cat-empaques', categoriaNombre: 'Empaques', proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', bodegaId: 'bg-empaques', bodegaNombre: 'Empaques', stockActual: 420_000, stockMinimo: 180_000, stockMaximo: 320_000, coberturaDias: 52.1, riesgo: 'LENTO_MOVIMIENTO' as const, valorInventario: 58_800_000 },
      { productoId: 'prod-arb-006', sku: 'ARB-CUA-450', productoNombre: 'Cuajada fresca 450 g', categoriaId: 'cat-quesos', categoriaNombre: 'Quesos frescos', proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', bodegaId: 'bg-cuarentena', bodegaNombre: 'Cuarentena', stockActual: 4_800, stockMinimo: 3_000, stockMaximo: 9_000, coberturaDias: 6.4, riesgo: 'VENCIMIENTO' as const, valorInventario: 13_920_000 },
    ].filter(
      (item) =>
        (!normalized.bodegaId || item.bodegaId === normalized.bodegaId) &&
        (!normalized.categoriaId || item.categoriaId === normalized.categoriaId) &&
        (!normalized.proveedorId || item.proveedorId === normalized.proveedorId),
    );

    return of<StrategicInventoryResponse>({
      filters: normalized,
      stockActual: 1_284_500,
      rotacionPromedio: 5.8,
      inventarioLento: 186_400_000,
      sobreinventario: 142_900_000,
      quiebres: 4,
      valorInventario: 1_184_000_000,
      coberturaDias: 18.7,
      topSkuCriticos,
      agingInventario: [
        { rangoDias: '0-30', productoId: 'prod-arb-003', sku: 'ARB-UHT-1L', productoNombre: 'Leche entera UHT 1L', bodegaId: 'bg-prod-terminado', bodegaNombre: 'Producto terminado', diasSinMovimiento: 18, unidades: 742_000, valorInventario: 612_000_000, participacionPct: 51.7, riesgo: null },
        { rangoDias: '31-60', productoId: 'mat-leche-cruda', sku: 'MP-LEC-CRUDA', productoNombre: 'Leche cruda refrigerada', bodegaId: 'bg-mp-lacteos', bodegaNombre: 'Materias primas lacteas', diasSinMovimiento: 42, unidades: 318_500, valorInventario: 274_000_000, participacionPct: 23.1, riesgo: 'CAPITAL_INMOVILIZADO' as const },
        { rangoDias: '61-90', productoId: 'mat-empaque-200', sku: 'EMP-BOT-200', productoNombre: 'Botella PET 200 ml', bodegaId: 'bg-empaques', bodegaNombre: 'Empaques', diasSinMovimiento: 72, unidades: 132_000, valorInventario: 111_600_000, participacionPct: 9.4, riesgo: 'LENTO_MOVIMIENTO' as const },
        { rangoDias: '>90', productoId: 'prod-arb-005', sku: 'ARB-AVN-1L', productoNombre: 'Avena UHT 1L', bodegaId: 'bg-prod-terminado', bodegaNombre: 'Producto terminado', diasSinMovimiento: 96, unidades: 92_000, valorInventario: 186_400_000, participacionPct: 15.8, riesgo: 'CAPITAL_INMOVILIZADO' as const },
      ],
      inventarioPorBodega: [
        { bodegaId: 'bg-prod-terminado', bodegaNombre: 'Producto terminado', stockActual: 384_500, valorInventario: 548_000_000, coberturaDias: 12.4, skuQuiebre: 3, skuSobrestock: 5, ocupacionPct: 87.4, observacion: 'Alto valor inmovilizado en UHT y riesgo de quiebre en yogurt.', estado: 'AMARILLO' as const },
        { bodegaId: 'bg-mp-lacteos', bodegaNombre: 'Materias primas lacteas', stockActual: 210_000, valorInventario: 326_000_000, coberturaDias: 8.9, skuQuiebre: 1, skuSobrestock: 2, ocupacionPct: 71.2, observacion: 'Cobertura sana, revisar leche cruda por vida util corta.', estado: 'VERDE' as const },
        { bodegaId: 'bg-empaques', bodegaNombre: 'Empaques', stockActual: 690_000, valorInventario: 310_000_000, coberturaDias: 34.2, skuQuiebre: 0, skuSobrestock: 8, ocupacionPct: 92.6, observacion: 'Sobrestock de botella PET y material secundario.', estado: 'AMARILLO' as const },
        { bodegaId: 'bg-cuarentena', bodegaNombre: 'Cuarentena', stockActual: 18_000, valorInventario: 46_000_000, coberturaDias: 5.1, skuQuiebre: 0, skuSobrestock: 1, ocupacionPct: 64.8, observacion: 'Liberar o disponer lotes con riesgo de vencimiento.', estado: 'ROJO' as const },
      ].filter((item) => !normalized.bodegaId || item.bodegaId === normalized.bodegaId),
      grafanaEmbedConfig: this.embed('strategic-inventory', normalized),
    }).pipe(delay(180));
  }

  getStrategicPurchasing(
    companyId: string,
    filters: StrategicPurchasingFilters,
  ): Observable<StrategicPurchasingResponse> {
    const normalized = this.withCompany(companyId, filters);
    const rankingProveedores = [
      { proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', categoriaId: 'cat-leche-cruda', categoriaPrincipal: 'Leche cruda', compras: 286_000_000, precioPromedio: 1_938, comprasUrgentes: 4, ahorroPct: 3.8, cumplimientoPct: 96.2, leadTimeDias: 1.2, score: 94 },
      { proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', categoriaId: 'cat-empaques', categoriaPrincipal: 'Empaques', compras: 174_500_000, precioPromedio: 142, comprasUrgentes: 9, ahorroPct: -4.7, cumplimientoPct: 89.4, leadTimeDias: 6.8, score: 77 },
      { proveedorId: 'sup-cultivos-pro', proveedorNombre: 'Cultivos Probioticos SAS', categoriaId: 'cat-cultivos', categoriaPrincipal: 'Cultivos', compras: 91_300_000, precioPromedio: 84_500, comprasUrgentes: 2, ahorroPct: 2.1, cumplimientoPct: 98.1, leadTimeDias: 4.5, score: 91 },
      { proveedorId: 'sup-azucar-centro', proveedorNombre: 'Ingenio Centro', categoriaId: 'cat-azucar', categoriaPrincipal: 'Endulzantes', compras: 68_400_000, precioPromedio: 4_180, comprasUrgentes: 3, ahorroPct: -1.6, cumplimientoPct: 92.0, leadTimeDias: 5.2, score: 82 },
    ].filter((item) => (!normalized.proveedorId || item.proveedorId === normalized.proveedorId) && (!normalized.categoriaId || item.categoriaId === normalized.categoriaId));

    return of<StrategicPurchasingResponse>({
      filters: normalized,
      ahorrosCompras: 24_800_000,
      proveedorMasCostoso: rankingProveedores.find((item) => item.ahorroPct < 0) ?? null,
      leadTimePromedioDias: 4.1,
      comprasUrgentes: 18,
      variacionPreciosPct: 5.6,
      rankingProveedores: rankingProveedores.sort((left, right) => right.score - left.score),
      tendenciaPrecios: [
        { fecha: '2026-01', valor: 1_740, insumoId: 'leche-cruda', insumoNombre: 'Leche cruda litro', categoriaId: 'cat-leche-cruda', categoriaNombre: 'Leche cruda', proveedorId: 'sup-leche-sabana', precioAnterior: 1_720, precioActual: 1_740, impactoEstimado: 2_800_000, variacionPct: 1.2, tendencia: 'SUBE' as const },
        { fecha: '2026-02', valor: 1_780, insumoId: 'leche-cruda', insumoNombre: 'Leche cruda litro', categoriaId: 'cat-leche-cruda', categoriaNombre: 'Leche cruda', proveedorId: 'sup-leche-sabana', precioAnterior: 1_740, precioActual: 1_780, impactoEstimado: 5_600_000, variacionPct: 2.3, tendencia: 'SUBE' as const },
        { fecha: '2026-03', valor: 1_835, insumoId: 'leche-cruda', insumoNombre: 'Leche cruda litro', categoriaId: 'cat-leche-cruda', categoriaNombre: 'Leche cruda', proveedorId: 'sup-leche-sabana', precioAnterior: 1_780, precioActual: 1_835, impactoEstimado: 7_700_000, variacionPct: 3.1, tendencia: 'SUBE' as const },
        { fecha: '2026-04', valor: 1_938, insumoId: 'leche-cruda', insumoNombre: 'Leche cruda litro', categoriaId: 'cat-leche-cruda', categoriaNombre: 'Leche cruda', proveedorId: 'sup-leche-sabana', precioAnterior: 1_835, precioActual: 1_938, impactoEstimado: 14_420_000, variacionPct: 5.6, tendencia: 'SUBE' as const },
        { fecha: '2026-04', valor: 142, insumoId: 'botella-pet-200', insumoNombre: 'Botella PET 200 ml', categoriaId: 'cat-empaques', categoriaNombre: 'Empaques', proveedorId: 'sup-empaques-andina', precioAnterior: 132, precioActual: 142, impactoEstimado: 8_900_000, variacionPct: 7.6, tendencia: 'SUBE' as const },
        { fecha: '2026-04', valor: 84_500, insumoId: 'cultivo-yogurt', insumoNombre: 'Cultivo yogurt termofilo', categoriaId: 'cat-cultivos', categoriaNombre: 'Cultivos', proveedorId: 'sup-cultivos-pro', precioAnterior: 86_200, precioActual: 84_500, impactoEstimado: -1_020_000, variacionPct: -2.0, tendencia: 'BAJA' as const },
      ].filter((item) => (!normalized.proveedorId || item.proveedorId === normalized.proveedorId) && (!normalized.categoriaId || item.categoriaId === normalized.categoriaId)),
      cumplimientoProveedores: [
        { proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', entregasATiempoPct: 96.2, leadTimeDias: 1.2, calidadRecepcionPct: 98.4, ordenesCompletasPct: 97.1, cumplimientoGlobalPct: 97.2, observacion: 'Proveedor estrategico con lead time corto y calidad estable.' },
        { proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', entregasATiempoPct: 89.4, leadTimeDias: 6.8, calidadRecepcionPct: 93.8, ordenesCompletasPct: 91.5, cumplimientoGlobalPct: 91.6, observacion: 'Riesgo por atrasos y aumento de precio en PET.' },
        { proveedorId: 'sup-cultivos-pro', proveedorNombre: 'Cultivos Probioticos SAS', entregasATiempoPct: 98.1, leadTimeDias: 4.5, calidadRecepcionPct: 99.2, ordenesCompletasPct: 96.8, cumplimientoGlobalPct: 98.0, observacion: 'Cumplimiento alto, oportunidad de contrato marco.' },
        { proveedorId: 'sup-azucar-centro', proveedorNombre: 'Ingenio Centro', entregasATiempoPct: 92.0, leadTimeDias: 5.2, calidadRecepcionPct: 96.4, ordenesCompletasPct: 94.1, cumplimientoGlobalPct: 94.2, observacion: 'Cumplimiento aceptable, revisar presupuesto por volatilidad.' },
      ].filter((item) => !normalized.proveedorId || item.proveedorId === normalized.proveedorId),
      comprasUrgentesDetalle: [
        { id: 'urg-pet-001', causa: 'QUIEBRE_STOCK' as const, proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', categoriaId: 'cat-empaques', categoriaNombre: 'Empaques', valor: 18_600_000, recomendacion: 'Ajustar punto de reorden de PET y ampliar ventana de planeacion.' },
        { id: 'urg-leche-002', causa: 'VENTA_INESPERADA' as const, proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', categoriaId: 'cat-leche-cruda', categoriaNombre: 'Leche cruda', valor: 24_200_000, recomendacion: 'Conectar forecast comercial con compras semanales.' },
        { id: 'urg-empaque-003', causa: 'PROVEEDOR_INCUMPLIDO' as const, proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', categoriaId: 'cat-empaques', categoriaNombre: 'Empaques', valor: 11_800_000, recomendacion: 'Homologar segundo proveedor para empaque secundario.' },
      ].filter((item) => (!normalized.proveedorId || item.proveedorId === normalized.proveedorId) && (!normalized.categoriaId || item.categoriaId === normalized.categoriaId)),
      oportunidades: [
        { id: 'opp-pet-renegociar', tipo: 'RENEGOCIAR_PRECIO' as const, proveedorId: 'sup-empaques-andina', proveedorNombre: 'Empaques Andina', categoriaNombre: 'Empaques', impactoEstimado: 12_400_000, recomendacion: 'Renegociar PET 200 ml por volumen trimestral y penalidad por atraso.' },
        { id: 'opp-leche-dependencia', tipo: 'AMPLIAR_LEAD_TIME' as const, proveedorId: 'sup-leche-sabana', proveedorNombre: 'Cooperativa Lechera Sabana', categoriaNombre: 'Leche cruda', impactoEstimado: 8_700_000, recomendacion: 'Bloquear cupo semanal con horizonte de 14 dias para reducir urgencias.' },
        { id: 'opp-cultivos-contrato', tipo: 'CONSOLIDAR_PROVEEDOR' as const, proveedorId: 'sup-cultivos-pro', proveedorNombre: 'Cultivos Probioticos SAS', categoriaNombre: 'Cultivos', impactoEstimado: 5_200_000, recomendacion: 'Consolidar contrato marco y escala de descuento por volumen.' },
        { id: 'opp-presupuesto-azucar', tipo: 'REVISAR_PRESUPUESTO' as const, proveedorId: 'sup-azucar-centro', proveedorNombre: 'Ingenio Centro', categoriaNombre: 'Endulzantes', impactoEstimado: 3_900_000, recomendacion: 'Actualizar presupuesto por volatilidad de endulzantes.' },
      ].filter((item) => !normalized.proveedorId || item.proveedorId === normalized.proveedorId),
      grafanaEmbedConfig: this.embed('strategic-purchasing', normalized),
    }).pipe(delay(180));
  }

  getLogisticsKpis(companyId: string, filters: LogisticsKpiFilters): Observable<LogisticsKpiResponse> {
    const normalized = this.withCompany(companyId, filters);
    const rankingRutas = [
      { rutaId: 'ruta-bog-norte', rutaNombre: 'Bogota Norte TAT', zonaId: 'bogota-norte', zonaNombre: 'Bogota Norte', pedidos: 146, entregas: 142, costoTransporte: 18_250_000, costoPorPedido: 125_000, kmRecorridos: 1_284, puntualidadEntregaPct: 94.2, observacion: 'Ruta estable, oportunidad de consolidar entregas TAT por franja.' },
      { rutaId: 'ruta-sabana', rutaNombre: 'Sabana mayoristas', zonaId: 'sabana', zonaNombre: 'Sabana', pedidos: 109, entregas: 103, costoTransporte: 16_350_000, costoPorPedido: 150_000, kmRecorridos: 1_476, puntualidadEntregaPct: 88.7, observacion: 'Ruta costosa por distancia y ventanas de recibo dispersas.' },
      { rutaId: 'ruta-centro', rutaNombre: 'Centro tradicional', zonaId: 'centro', zonaNombre: 'Centro', pedidos: 98, entregas: 95, costoTransporte: 13_720_000, costoPorPedido: 140_000, kmRecorridos: 1_036, puntualidadEntregaPct: 90.5, observacion: 'Afectada por trafico urbano y reentregas parciales.' },
      { rutaId: 'ruta-sur-institucional', rutaNombre: 'Sur institucional', zonaId: 'sur', zonaNombre: 'Sur', pedidos: 74, entregas: 68, costoTransporte: 12_580_000, costoPorPedido: 170_000, kmRecorridos: 1_120, puntualidadEntregaPct: 86.4, observacion: 'Revisar frecuencia: costo por pedido alto y baja puntualidad.' },
    ].filter((item) => (!normalized.zonaId || item.zonaId === normalized.zonaId) && (!normalized.rutaId || item.rutaId === normalized.rutaId));
    const rankingConductores = [
      { conductorId: 'drv-001', conductorNombre: 'Hector Molina', rutaPrincipalId: 'ruta-bog-norte', rutaPrincipalNombre: 'Bogota Norte TAT', entregas: 126, puntualidadEntregaPct: 95.1, kmRecorridos: 1_140, costoAsociado: 15_740_000, productividad: 11.1, novedades: 2, observacion: 'Mejor desempeno; candidato para rutas criticas.' },
      { conductorId: 'drv-002', conductorNombre: 'Paula Rojas', rutaPrincipalId: 'ruta-centro', rutaPrincipalNombre: 'Centro tradicional', entregas: 118, puntualidadEntregaPct: 92.4, kmRecorridos: 1_086, costoAsociado: 14_200_000, productividad: 10.9, novedades: 3, observacion: 'Productividad alta con trafico urbano controlado.' },
      { conductorId: 'drv-003', conductorNombre: 'Ivan Cardenas', rutaPrincipalId: 'ruta-sabana', rutaPrincipalNombre: 'Sabana mayoristas', entregas: 109, puntualidadEntregaPct: 87.8, kmRecorridos: 1_570, costoAsociado: 18_900_000, productividad: 6.9, novedades: 6, observacion: 'Requiere apoyo por distancia, ventanas y reentregas.' },
      { conductorId: 'drv-004', conductorNombre: 'Marcela Gil', rutaPrincipalId: 'ruta-sur-institucional', rutaPrincipalNombre: 'Sur institucional', entregas: 55, puntualidadEntregaPct: 84.9, kmRecorridos: 720, costoAsociado: 8_060_000, productividad: 7.6, novedades: 5, observacion: 'Ruta subutilizada; revisar consolidacion con Centro.' },
    ].filter((item) => !normalized.conductorId || item.conductorId === normalized.conductorId);
    const costoTransporte = rankingRutas.reduce((sum, item) => sum + item.costoTransporte, 0);
    const pedidos = rankingRutas.reduce((sum, item) => sum + item.pedidos, 0);
    const flota = [
      { vehiculoId: 'veh-001', placa: 'ARB-241', tipoVehiculo: 'Furgon refrigerado', conductorId: 'drv-001', conductorNombre: 'Hector Molina', capacidadKg: 2_800, cargaUtilizadaKg: 2_475, utilizacionPct: 88.4, kmRecorridos: 1_240, estado: 'EN_RUTA' as const, accionSugerida: 'Mantener asignacion y usar como referencia de productividad.' },
      { vehiculoId: 'veh-002', placa: 'ARB-318', tipoVehiculo: 'Camion NHR', conductorId: 'drv-002', conductorNombre: 'Paula Rojas', capacidadKg: 2_400, cargaUtilizadaKg: 1_960, utilizacionPct: 81.7, kmRecorridos: 1_086, estado: 'EN_RUTA' as const, accionSugerida: 'Optimizar secuencia de entregas urbanas.' },
      { vehiculoId: 'veh-003', placa: 'ARB-156', tipoVehiculo: 'Turbo refrigerado', conductorId: 'drv-003', conductorNombre: 'Ivan Cardenas', capacidadKg: 3_200, cargaUtilizadaKg: 2_064, utilizacionPct: 64.5, kmRecorridos: 470, estado: 'MANTENIMIENTO' as const, accionSugerida: 'Revisar disponibilidad TPM y reasignar carga de Sabana.' },
      { vehiculoId: 'veh-004', placa: 'ARB-412', tipoVehiculo: 'VAN refrigerada', conductorId: 'drv-004', conductorNombre: 'Marcela Gil', capacidadKg: 1_600, cargaUtilizadaKg: 820, utilizacionPct: 51.3, kmRecorridos: 390, estado: 'DISPONIBLE' as const, accionSugerida: 'Consolidar ruta Sur con Centro o reasignar a entregas express.' },
    ].filter((item) => !normalized.vehiculoId || item.vehiculoId === normalized.vehiculoId);

    return of<LogisticsKpiResponse>({
      filters: normalized,
      costoTransporte,
      costoPorPedido: pedidos ? Math.round(costoTransporte / pedidos) : 0,
      pedidosPorRuta: rankingRutas.length ? Math.round(pedidos / rankingRutas.length) : 0,
      entregasPorConductor: rankingConductores.length ? Math.round(rankingConductores.reduce((sum, item) => sum + item.entregas, 0) / rankingConductores.length) : 0,
      utilizacionFlota: 82.6,
      kmRecorridos: rankingRutas.reduce((sum, item) => sum + item.kmRecorridos, 0),
      puntualidadEntrega: rankingRutas.length ? Number((rankingRutas.reduce((sum, item) => sum + item.puntualidadEntregaPct, 0) / rankingRutas.length).toFixed(1)) : 0,
      entregasTardias: 26,
      reentregas: 11,
      rankingRutas: rankingRutas.sort((left, right) => right.puntualidadEntregaPct - left.puntualidadEntregaPct),
      rankingConductores: rankingConductores.sort((left, right) => right.puntualidadEntregaPct - left.puntualidadEntregaPct),
      flota,
      tendenciaCostos: [
        { fecha: '2026-01', costoTransporte: 52_100_000, costoPorPedido: 136_000, puntualidadEntregaPct: 89.2 },
        { fecha: '2026-02', costoTransporte: 54_700_000, costoPorPedido: 139_000, puntualidadEntregaPct: 90.1 },
        { fecha: '2026-03', costoTransporte: 57_400_000, costoPorPedido: 143_000, puntualidadEntregaPct: 91.0 },
        { fecha: '2026-04', costoTransporte, costoPorPedido: pedidos ? Math.round(costoTransporte / pedidos) : 0, puntualidadEntregaPct: rankingRutas.length ? Number((rankingRutas.reduce((sum, item) => sum + item.puntualidadEntregaPct, 0) / rankingRutas.length).toFixed(1)) : 0 },
      ],
      grafanaEmbedConfig: this.embed('logistics-kpi', normalized),
    }).pipe(delay(180));
  }

  getGrafanaDashboards(_companyId: string): Observable<GrafanaDashboardConfig[]> {
    return of(this.grafanaCatalog()).pipe(delay(120));
  }

  private grafanaCatalog(): GrafanaDashboardConfig[] {
    return [
      { dashboardKey: 'executive-dashboard', dashboardUid: 'medussa-executive', title: 'HU-033 Dashboard Ejecutivo 360', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.executive.view' },
      { dashboardKey: 'profitability', dashboardUid: 'medussa-profitability', title: 'HU-034 Rentabilidad Producto / Linea', datasource: 'datamart', refreshInterval: '1h', requiredPermission: 'bi.profitability.view' },
      { dashboardKey: 'managerial-alerts', dashboardUid: 'medussa-alerts', title: 'HU-035 Alertas Gerenciales', datasource: 'datamart', refreshInterval: '5m', requiredPermission: 'bi.alerts.view' },
      { dashboardKey: 'commercial-performance', dashboardUid: 'medussa-commercial', title: 'HU-036 Ventas y Cumplimiento Comercial', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.commercial.view' },
      { dashboardKey: 'strategic-clients', dashboardUid: 'medussa-clients', title: 'HU-037 Clientes Estrategicos', datasource: 'datamart', refreshInterval: '30m', requiredPermission: 'bi.clients.view' },
      { dashboardKey: 'demand-vs-forecast', dashboardUid: 'medussa-forecast', title: 'HU-038 Demanda vs Forecast', datasource: 'datamart', refreshInterval: '30m', requiredPermission: 'bi.forecast.view' },
      { dashboardKey: 'production-realtime', dashboardUid: 'medussa-production-rt', title: 'HU-039 Produccion Tiempo Real', datasource: 'datamart', refreshInterval: '1m', requiredPermission: 'bi.operations.production-rt.view' },
      { dashboardKey: 'oee-plant', dashboardUid: 'medussa-oee-plant', title: 'HU-040 OEE Consolidado Planta', datasource: 'datamart', refreshInterval: '5m', requiredPermission: 'bi.operations.oee.view' },
      { dashboardKey: 'quality-nonconformity', dashboardUid: 'medussa-quality-nc', title: 'HU-041 Calidad y No Conformidades', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.operations.quality.view' },
      { dashboardKey: 'strategic-inventory', dashboardUid: 'medussa-inventory-strategic', title: 'HU-042 Inventario Estrategico', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.supply.inventory.view' },
      { dashboardKey: 'strategic-purchasing', dashboardUid: 'medussa-purchases-strategic', title: 'HU-043 Compras Estrategicas', datasource: 'datamart', refreshInterval: '1h', requiredPermission: 'bi.supply.purchases.view' },
      { dashboardKey: 'logistics-kpi', dashboardUid: 'medussa-logistics-kpi', title: 'HU-044 KPI Logisticos', datasource: 'datamart', refreshInterval: '15m', requiredPermission: 'bi.supply.logistics.view' },
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
      { productoId: 'prod-arb-001', sku: 'ARB-YOG-200-FR', productoNombre: 'Yogurt bebible fresa 200 ml', lineaProductoId: 'lacteos-bebibles', lineaProductoNombre: 'Lacteos bebibles', ventas: 178_200_000, costoVariable: 92_400_000, costoIndirecto: 17_200_000, costoVentas: 109_600_000, utilidad: 68_600_000, margenBruto: 68_600_000, margenBrutoPct: 38.5, clasificacion: 'ALTA_RENTABILIDAD', causaSugerida: 'Rotacion alta y BOM estable con empaque controlado.' },
      { productoId: 'prod-arb-004', sku: 'ARB-KUM-150', productoNombre: 'Kumis tradicional 150 g', lineaProductoId: 'lacteos-bebibles', lineaProductoNombre: 'Lacteos bebibles', ventas: 84_700_000, costoVariable: 48_900_000, costoIndirecto: 8_100_000, costoVentas: 57_000_000, utilidad: 27_700_000, margenBruto: 27_700_000, margenBrutoPct: 32.7, clasificacion: 'RENTABLE', causaSugerida: 'Buen margen, dependiente de eficiencia de llenado.' },
      { productoId: 'prod-arb-003', sku: 'ARB-UHT-1L', productoNombre: 'Leche entera UHT 1L', lineaProductoId: 'uht', lineaProductoNombre: 'UHT', ventas: 142_800_000, costoVariable: 86_300_000, costoIndirecto: 14_900_000, costoVentas: 101_200_000, utilidad: 41_600_000, margenBruto: 41_600_000, margenBrutoPct: 29.1, clasificacion: 'RENTABLE', causaSugerida: 'Volumen estable con costo energetico moderado.' },
      { productoId: 'prod-arb-002', sku: 'ARB-QUE-500', productoNombre: 'Queso campesino 500 g', lineaProductoId: 'quesos', lineaProductoNombre: 'Quesos', ventas: 96_400_000, costoVariable: 67_800_000, costoIndirecto: 10_100_000, costoVentas: 77_900_000, utilidad: 18_500_000, margenBruto: 18_500_000, margenBrutoPct: 19.2, clasificacion: 'MARGEN_BAJO', causaSugerida: 'Costo materia prima alto y merma estimada en maduracion.' },
      { productoId: 'prod-arb-006', sku: 'ARB-CUA-450', productoNombre: 'Cuajada fresca 450 g', lineaProductoId: 'quesos', lineaProductoNombre: 'Quesos', ventas: 52_600_000, costoVariable: 38_700_000, costoIndirecto: 6_900_000, costoVentas: 45_600_000, utilidad: 7_000_000, margenBruto: 7_000_000, margenBrutoPct: 13.3, clasificacion: 'REVISAR_COSTO', causaSugerida: 'Baja rotacion y costo indirecto alto por lote corto.' },
      { productoId: 'prod-arb-005', sku: 'ARB-AVN-1L', productoNombre: 'Avena UHT 1L', lineaProductoId: 'uht', lineaProductoNombre: 'UHT', ventas: 64_900_000, costoVariable: 50_800_000, costoIndirecto: 7_900_000, costoVentas: 58_700_000, utilidad: 6_200_000, margenBruto: 6_200_000, margenBrutoPct: 9.6, clasificacion: 'MARGEN_BAJO', causaSugerida: 'Bajo precio venta y costo de empaque por encima del objetivo.' },
    ];
  }

  private profitabilityLineSummary(ranking: ProductProfitabilityItem[], ventasTotales: number) {
    const grouped = new Map<string, ProductProfitabilityItem[]>();

    ranking.forEach((item) => {
      const key = item.lineaProductoId ?? 'sin-linea';
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });

    return Array.from(grouped.entries()).map(([lineaProductoId, items]) => {
      const ventas = items.reduce((sum, item) => sum + item.ventas, 0);
      const costoTotal = items.reduce((sum, item) => sum + item.costoVentas, 0);
      const utilidad = items.reduce((sum, item) => sum + item.utilidad, 0);

      return {
        lineaProductoId,
        lineaProductoNombre: items[0]?.lineaProductoNombre ?? 'Sin linea',
        ventas,
        costoTotal,
        utilidad,
        margenPromedioPct: ventas ? Number(((utilidad / ventas) * 100).toFixed(1)) : 0,
        participacionVentasPct: ventasTotales ? Number(((ventas / ventasTotales) * 100).toFixed(1)) : 0,
      };
    }).sort((left, right) => right.utilidad - left.utilidad);
  }

  private executiveManagerialAlerts(companyId: string): ManagerialAlert[] {
    return [
      {
        id: `${companyId}-bi-alert-stock-yogurt`,
        empresaId: companyId,
        titulo: 'Quiebre de stock proyectado',
        descripcion: 'Yogurt bebible fresa 200 ml cae por debajo del stock minimo operativo para canal TAT.',
        tipoAlerta: 'QUIEBRE_STOCK',
        severidad: 'ROJA',
        estado: 'ABIERTA',
        fechaDeteccion: '2026-04-29',
        valorDetectado: '1.8 dias cobertura',
        umbral: '3 dias cobertura',
        responsableSugerido: 'Jefatura SCM',
        sedeId: 'arb-planta-principal',
        sedeNombre: 'Planta principal',
        moduloOrigen: 'INVENTORY_CORE',
        entidadId: 'prod-arb-001',
        grafanaPanelUid: 'stock-break-risk',
      },
      {
        id: `${companyId}-bi-alert-sales-center`,
        empresaId: companyId,
        titulo: 'Caida de ventas en zona Centro',
        descripcion: 'La venta diaria de zona Centro cae frente al promedio movil de 14 dias.',
        tipoAlerta: 'CAIDA_VENTAS',
        severidad: 'AMARILLA',
        estado: 'EN_GESTION',
        fechaDeteccion: '2026-04-28',
        valorDetectado: '-12.4%',
        umbral: '-8%',
        responsableSugerido: 'Gerencia Comercial',
        sedeId: 'arb-bogota-norte',
        sedeNombre: 'Bogota Norte',
        moduloOrigen: 'COMMERCIAL_PERFORMANCE',
        entidadId: 'zona-centro',
        grafanaPanelUid: 'sales-drop-zone',
      },
      {
        id: `${companyId}-bi-alert-oee-line-2`,
        empresaId: companyId,
        titulo: 'OEE bajo en linea de lacteos',
        descripcion: 'La linea 2 presenta microparadas repetidas y baja eficiencia real del turno.',
        tipoAlerta: 'OEE_BAJO',
        severidad: 'ROJA',
        estado: 'ABIERTA',
        fechaDeteccion: '2026-04-28',
        valorDetectado: '68.5%',
        umbral: '75%',
        responsableSugerido: 'Lider de Produccion',
        sedeId: 'arb-planta-principal',
        sedeNombre: 'Planta principal',
        moduloOrigen: 'OEE',
        entidadId: 'linea-lacteos-2',
        grafanaPanelUid: 'oee-line-risk',
      },
      {
        id: `${companyId}-bi-alert-late-orders`,
        empresaId: companyId,
        titulo: 'Pedidos atrasados en Sabana',
        descripcion: 'Pedidos con packing cerrado tarde presionan el cumplimiento OTIF de la zona Sabana.',
        tipoAlerta: 'PEDIDOS_ATRASADOS',
        severidad: 'AMARILLA',
        estado: 'ABIERTA',
        fechaDeteccion: '2026-04-27',
        valorDetectado: 18,
        umbral: 10,
        responsableSugerido: 'Coordinacion Logistica',
        sedeId: 'arb-sabana',
        sedeNombre: 'Sabana',
        moduloOrigen: 'PICKING_PACKING',
        entidadId: 'zona-sabana',
        grafanaPanelUid: 'late-orders-zone',
      },
      {
        id: `${companyId}-bi-alert-budget-packaging`,
        empresaId: companyId,
        titulo: 'Desviacion presupuestal en empaques',
        descripcion: 'El consumo de doypack 1L supera el presupuesto de abastecimiento del periodo.',
        tipoAlerta: 'DESVIACION_PRESUPUESTO',
        severidad: 'AMARILLA',
        estado: 'EN_GESTION',
        fechaDeteccion: '2026-04-26',
        valorDetectado: '+9.8%',
        umbral: '+5%',
        responsableSugerido: 'Planeacion Financiera',
        sedeId: 'arb-planta-principal',
        sedeNombre: 'Planta principal',
        moduloOrigen: 'BUDGET_MANAGEMENT',
        entidadId: 'prod-arb-005',
        grafanaPanelUid: 'budget-packaging',
      },
      {
        id: `${companyId}-bi-alert-margin-cheese`,
        empresaId: companyId,
        titulo: 'Margen bajo en queso campesino',
        descripcion: 'El costo variable de Queso campesino 500 g reduce el margen bruto objetivo.',
        tipoAlerta: 'MARGEN_BAJO',
        severidad: 'ROJA',
        estado: 'ABIERTA',
        fechaDeteccion: '2026-04-25',
        valorDetectado: '19.2%',
        umbral: '24%',
        responsableSugerido: 'Gerencia Comercial',
        sedeId: 'arb-planta-principal',
        sedeNombre: 'Planta principal',
        moduloOrigen: 'COSTS_CORE',
        entidadId: 'prod-arb-002',
        grafanaPanelUid: 'margin-risk',
      },
      {
        id: `${companyId}-bi-alert-otif-normalized`,
        empresaId: companyId,
        titulo: 'OTIF recuperado en Bogota Norte',
        descripcion: 'La zona mantiene cumplimiento logistico controlado luego de ajustar rutas y packing.',
        tipoAlerta: 'PEDIDOS_ATRASADOS',
        severidad: 'VERDE',
        estado: 'CERRADA',
        fechaDeteccion: '2026-04-22',
        valorDetectado: '93.1%',
        umbral: '90%',
        responsableSugerido: 'Coordinacion Logistica',
        sedeId: 'arb-bogota-norte',
        sedeNombre: 'Bogota Norte',
        moduloOrigen: 'PICKING_PACKING',
        entidadId: 'bogota-norte',
        grafanaPanelUid: 'otif-zone',
      },
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
