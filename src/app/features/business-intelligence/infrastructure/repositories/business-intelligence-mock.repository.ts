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
      { dashboardKey: 'demand-vs-forecast', dashboardUid: 'medussa-forecast', title: 'HU-038 Demanda vs Forecast', datasource: 'datamart', refreshInterval: '30m', requiredPermission: 'bi.forecast.view' },
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
