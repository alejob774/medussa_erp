import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Client } from '../../../clients/domain/models/client.model';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { DemandAnalysisAlert, DemandAnalysisAlertSeverity } from '../../domain/models/demand-analysis-alert.model';
import { DemandAnalysisDetail } from '../../domain/models/demand-analysis-detail.model';
import {
  DEFAULT_DEMAND_ANALYSIS_FILTERS,
  DemandAnalysisFilters,
} from '../../domain/models/demand-analysis-filters.model';
import { DemandAnalysisKpis } from '../../domain/models/demand-analysis-kpi.model';
import {
  DemandAnalysis,
  DemandAnalysisAggregate,
  DemandAnalysisCatalogs,
  DemandAnalysisCharts,
  DemandAnalysisRankingPoint,
  DemandAnalysisRegionalPoint,
  DemandAnalysisTrendPoint,
} from '../../domain/models/demand-analysis.model';
import {
  DemandAnalysisAuditDraft,
  DemandAnalysisDashboard,
  DemandAnalysisMutationResult,
  DemandAnalysisStore,
} from '../../domain/models/demand-analysis-response.model';
import { DemandAnalysisRepository } from '../../domain/repositories/demand-analysis.repository';
import { DemandForecastAggregate } from '../../../demand-forecast/domain/models/demand-forecast.model';
import { DemandForecastStore } from '../../../demand-forecast/domain/models/demand-forecast-response.model';
import { DemandForecastDetail } from '../../../demand-forecast/domain/models/demand-forecast-detail.model';

const ANALYSIS_STORAGE_KEY = 'medussa.erp.mock.demand-analysis';
const FORECAST_STORAGE_KEY = 'medussa.erp.mock.demand-forecasts';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const CLIENTS_STORAGE_KEY = 'medussa.erp.mock.clients';
const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
};

@Injectable({
  providedIn: 'root',
})
export class DemandAnalysisMockRepository implements DemandAnalysisRepository {
  getDashboard(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureBaseline(this.readStore(), companyId, normalizedFilters);
    const catalogs = this.buildCatalogs(companyId);
    const analyses = store.analyses
      .filter((aggregate) => aggregate.analysis.empresaId === companyId)
      .filter((aggregate) => this.matchesAnalysisFilters(aggregate, normalizedFilters))
      .sort((left, right) => new Date(right.analysis.creadoEn).getTime() - new Date(left.analysis.creadoEn).getTime());
    const selectedAnalysis =
      analyses.find((aggregate) => aggregate.analysis.forecastBaseId === normalizedFilters.selectedForecastId) ??
      analyses[0] ??
      null;

    return of({
      filters: normalizedFilters,
      catalogs,
      analyses: analyses.map((aggregate) => this.cloneAggregate(aggregate, normalizedFilters.alertSeverity)),
      selectedAnalysis: selectedAnalysis
        ? this.cloneAggregate(selectedAnalysis, normalizedFilters.alertSeverity)
        : null,
      kpis: this.buildKpis(selectedAnalysis),
      charts: this.buildCharts(selectedAnalysis),
    }).pipe(delay(180));
  }

  refreshAnalysis(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisMutationResult> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.readStore();
    const forecast = this.resolveBaseForecast(companyId, normalizedFilters);

    if (!forecast) {
      return throwError(() => new Error('No existe forecast aprobado disponible para analizar.'));
    }

    const aggregate = this.buildAnalysisAggregate(companyId, normalizedFilters, forecast);
    const auditDraft = this.buildAuditDraft(
      store.analyses.some((item) => item.analysis.id === aggregate.analysis.id) ? 'refresh' : 'analyze',
      aggregate,
      `Analisis regenerado con base en ${forecast.forecast.nombreForecast}.`,
      null,
      this.sanitizeAggregate(aggregate),
    );
    const nextStore: DemandAnalysisStore = {
      ...store,
      analyses: [aggregate, ...store.analyses.filter((item) => item.analysis.id !== aggregate.analysis.id)],
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);

    return of<DemandAnalysisMutationResult>({
      action: 'analyzed',
      analysis: this.cloneAggregate(aggregate, 'TODAS'),
      message: `Analisis ejecutivo actualizado desde ${forecast.forecast.nombreForecast}.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): DemandAnalysisStore {
    if (typeof window === 'undefined') {
      return { analyses: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);

    if (!raw) {
      const initial: DemandAnalysisStore = { analyses: [], auditTrail: [] };
      this.writeStore(initial);
      return initial;
    }

    try {
      const parsed = JSON.parse(raw) as DemandAnalysisStore;
      return {
        analyses: parsed.analyses ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const fallback: DemandAnalysisStore = { analyses: [], auditTrail: [] };
      this.writeStore(fallback);
      return fallback;
    }
  }

  private writeStore(store: DemandAnalysisStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(store));
  }

  private readForecastStore(): DemandForecastStore {
    if (typeof window === 'undefined') {
      return { forecasts: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(FORECAST_STORAGE_KEY);

    if (!raw) {
      return { forecasts: [], auditTrail: [] };
    }

    try {
      const parsed = JSON.parse(raw) as DemandForecastStore;
      return {
        forecasts: parsed.forecasts ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return { forecasts: [], auditTrail: [] };
    }
  }

  private readProducts(): Product[] {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_PRODUCTS_STORE.products);
    }

    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return structuredClone(INITIAL_PRODUCTS_STORE.products);
    }

    try {
      return (JSON.parse(raw) as ProductStore).products ?? structuredClone(INITIAL_PRODUCTS_STORE.products);
    } catch {
      return structuredClone(INITIAL_PRODUCTS_STORE.products);
    }
  }

  private readClients(): Client[] {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_CLIENTS_STORE.clients);
    }

    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      return structuredClone(INITIAL_CLIENTS_STORE.clients);
    }

    try {
      return (JSON.parse(raw) as ClientStore).clients ?? structuredClone(INITIAL_CLIENTS_STORE.clients);
    } catch {
      return structuredClone(INITIAL_CLIENTS_STORE.clients);
    }
  }

  private ensureBaseline(
    store: DemandAnalysisStore,
    companyId: string,
    filters: DemandAnalysisFilters,
  ): DemandAnalysisStore {
    const forecast = this.resolveBaseForecast(companyId, filters);

    if (!forecast) {
      return store;
    }

    const analysisId = this.buildAnalysisId(companyId, forecast.forecast.id);
    const exists = store.analyses.some((aggregate) => aggregate.analysis.id === analysisId);

    if (exists) {
      return store;
    }

    const aggregate = this.buildAnalysisAggregate(companyId, filters, forecast);
    const auditDraft = this.buildAuditDraft(
      'analyze',
      aggregate,
      `Seed inicial de analisis para ${forecast.forecast.nombreForecast}.`,
      null,
      this.sanitizeAggregate(aggregate),
    );
    const nextStore = {
      ...store,
      analyses: [aggregate, ...store.analyses],
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);

    return nextStore;
  }

  private resolveBaseForecast(
    companyId: string,
    filters: DemandAnalysisFilters,
  ): DemandForecastAggregate | null {
    const forecastStore = this.readForecastStore();
    const approvedForecasts = forecastStore.forecasts
      .filter((aggregate) => aggregate.forecast.empresaId === companyId)
      .filter((aggregate) => !filters.approvedOnly || aggregate.forecast.estado === 'APROBADO')
      .sort((left, right) => {
        if (left.forecast.isOfficialVersion !== right.forecast.isOfficialVersion) {
          return left.forecast.isOfficialVersion ? -1 : 1;
        }

        return right.forecast.version - left.forecast.version;
      });

    if (!approvedForecasts.length) {
      return null;
    }

    return (
      approvedForecasts.find((aggregate) => aggregate.forecast.id === filters.selectedForecastId) ??
      approvedForecasts[0] ??
      null
    );
  }

  private buildCatalogs(companyId: string): DemandAnalysisCatalogs {
    const forecastStore = this.readForecastStore();
    const clients = this.readClients()
      .filter((client) => client.empresaId === companyId)
      .filter((client) => client.estado === 'ACTIVO')
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const products = this.readProducts()
      .filter((product) => product.empresaId === companyId)
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const approvedForecasts = forecastStore.forecasts
      .filter((aggregate) => aggregate.forecast.empresaId === companyId)
      .filter((aggregate) => aggregate.forecast.estado === 'APROBADO');
    const channels = new Set(approvedForecasts.flatMap((aggregate) => aggregate.details.map((detail) => detail.canal)));
    const zones = new Set(approvedForecasts.flatMap((aggregate) => aggregate.details.map((detail) => detail.zona)));
    const segments = new Set(approvedForecasts.flatMap((aggregate) => aggregate.details.map((detail) => detail.segmento)));

    return {
      channels: this.mapOptions(channels),
      zones: this.mapOptions(zones),
      segments: this.mapOptions(segments),
      products: products.map((product) => ({
        value: product.id,
        label: `${product.sku} · ${product.nombre}`,
      })),
      clients: clients.map((client) => ({
        value: client.id,
        label: `${client.idCliente} · ${client.nombre}`,
        zone: client.zona?.trim() || 'Zona norte 1',
        segment: this.resolveSegment(client),
      })),
      forecasts: approvedForecasts.map((aggregate) => ({
        value: aggregate.forecast.id,
        label: `v${aggregate.forecast.version} · ${aggregate.forecast.nombreForecast}`,
      })),
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private buildAnalysisAggregate(
    companyId: string,
    filters: DemandAnalysisFilters,
    forecastAggregate: DemandForecastAggregate,
  ): DemandAnalysisAggregate {
    const products = new Map(
      this.readProducts()
        .filter((product) => product.empresaId === companyId)
        .map((product) => [product.id, product]),
    );
    const details = forecastAggregate.details
      .filter((detail) => this.matchesForecastDetail(detail, filters, products))
      .map((detail) => this.buildDetail(forecastAggregate, detail, products.get(detail.skuId) ?? null));
    const analysis: DemandAnalysis = {
      id: this.buildAnalysisId(companyId, forecastAggregate.forecast.id),
      empresaId: companyId,
      empresaNombre:
        COMPANY_DISPLAY_NAMES[companyId] ??
        forecastAggregate.forecast.empresaNombre,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      canal: filters.canal,
      zona: filters.zona,
      segmento: filters.segmento,
      clienteId: filters.clienteId,
      clienteNombre: details.find((detail) => detail.clienteId === filters.clienteId)?.clienteNombre ?? null,
      forecastBaseId: forecastAggregate.forecast.id,
      creadoEn: new Date().toISOString(),
      resumenKpis: this.computeKpis(details, []),
    };
    const alerts = this.buildAlerts(analysis.id, details);

    return {
      analysis: {
        ...analysis,
        resumenKpis: this.computeKpis(details, alerts),
      },
      details,
      alerts,
    };
  }

  private buildDetail(
    forecastAggregate: DemandForecastAggregate,
    detail: DemandForecastDetail,
    product: Product | null,
  ): DemandAnalysisDetail {
    const actual = this.calculateActualSales(detail, forecastAggregate.forecast.version);
    const forecast = detail.forecastFinal;
    const deviationAbs = actual - forecast;
    const deviationPct = forecast ? Math.round((deviationAbs / forecast) * 100) : 0;
    const mape = forecast ? Math.round((Math.abs(actual - forecast) / forecast) * 100) : 0;
    const sesgo = forecast ? Number(((actual - forecast) / forecast).toFixed(2)) : 0;
    const trend = deviationPct > 8 ? 'CRECE' : deviationPct < -8 ? 'CAE' : 'ESTABLE';
    const variability = Math.min(98, Math.abs(deviationPct) + (this.hashValue(`${detail.sku}-${detail.periodo}`) % 18));
    const unitValue = this.resolveUnitValue(product, detail);
    const alert = this.resolvePrimaryAlert(deviationPct, trend, variability);

    return {
      id: `analysis-detail-${detail.id}`,
      analisisId: this.buildAnalysisId(forecastAggregate.forecast.empresaId, forecastAggregate.forecast.id),
      skuId: detail.skuId,
      sku: detail.sku,
      productoNombre: detail.productoNombre,
      canal: detail.canal,
      zona: detail.zona,
      segmento: detail.segmento,
      clienteId: detail.clienteId ?? null,
      clienteNombre: detail.clienteNombre ?? null,
      periodo: detail.periodo,
      forecast,
      ventaReal: actual,
      desviacionAbs: deviationAbs,
      desviacionPct: deviationPct,
      mape,
      sesgo,
      tendencia: trend,
      variabilidad: variability,
      valorVenta: actual * unitValue,
      alertaPrincipal: alert,
    };
  }

  private buildAlerts(analysisId: string, details: DemandAnalysisDetail[]): DemandAnalysisAlert[] {
    return details
      .flatMap((detail): DemandAnalysisAlert[] => {
        const alerts: DemandAnalysisAlert[] = [];

        if (Math.abs(detail.desviacionPct) >= 22) {
          alerts.push({
            id: `alert-gap-${detail.id}`,
            analisisId: analysisId,
            skuId: detail.skuId,
            sku: detail.sku,
            tipo: 'DESVIACION_ALTA',
            severidad: Math.abs(detail.desviacionPct) >= 35 ? 'ALTA' : 'MEDIA',
            descripcion: `Desviacion de ${detail.desviacionPct}% frente al forecast.`,
            zona: detail.zona,
            canal: detail.canal,
          });
        }

        if (detail.tendencia === 'CAE') {
          alerts.push({
            id: `alert-drop-${detail.id}`,
            analisisId: analysisId,
            skuId: detail.skuId,
            sku: detail.sku,
            tipo: 'CAIDA_DEMANDA',
            severidad: detail.desviacionPct <= -25 ? 'ALTA' : 'MEDIA',
            descripcion: `Caida detectada en ${detail.periodo} con sesgo ${detail.sesgo}.`,
            zona: detail.zona,
            canal: detail.canal,
          });
        }

        if (detail.tendencia === 'CRECE' && detail.desviacionPct >= 18) {
          alerts.push({
            id: `alert-growth-${detail.id}`,
            analisisId: analysisId,
            skuId: detail.skuId,
            sku: detail.sku,
            tipo: 'CRECIMIENTO_ATIPICO',
            severidad: detail.desviacionPct >= 30 ? 'ALTA' : 'MEDIA',
            descripcion: `Crecimiento atipico sobre forecast en ${detail.periodo}.`,
            zona: detail.zona,
            canal: detail.canal,
          });
        }

        if (detail.variabilidad >= 30) {
          alerts.push({
            id: `alert-var-${detail.id}`,
            analisisId: analysisId,
            skuId: detail.skuId,
            sku: detail.sku,
            tipo: 'ALTA_VARIABILIDAD',
            severidad: detail.variabilidad >= 45 ? 'ALTA' : 'BAJA',
            descripcion: `Variabilidad de ${detail.variabilidad}% detectada en la serie.`,
            zona: detail.zona,
            canal: detail.canal,
          });
        }

        return alerts;
      })
      .slice(0, 36);
  }

  private computeKpis(details: DemandAnalysisDetail[], alerts: DemandAnalysisAlert[]): DemandAnalysisKpis {
    const totalForecast = details.reduce((total, detail) => total + detail.forecast, 0);
    const totalActual = details.reduce((total, detail) => total + detail.ventaReal, 0);
    const totalMape = details.reduce((total, detail) => total + detail.mape, 0);
    const totalBias = details.reduce((total, detail) => total + detail.sesgo, 0);

    return {
      averageMape: details.length ? Math.round(totalMape / details.length) : 0,
      averageBias: details.length ? Number((totalBias / details.length).toFixed(2)) : 0,
      growingSkus: new Set(details.filter((detail) => detail.tendencia === 'CRECE').map((detail) => detail.skuId)).size,
      decliningSkus: new Set(details.filter((detail) => detail.tendencia === 'CAE').map((detail) => detail.skuId)).size,
      activeAlerts: alerts.length,
      totalForecast,
      totalActual,
    };
  }

  private buildKpis(aggregate: DemandAnalysisAggregate | null): DemandAnalysisKpis {
    return (
      aggregate?.analysis.resumenKpis ?? {
        averageMape: 0,
        averageBias: 0,
        growingSkus: 0,
        decliningSkus: 0,
        activeAlerts: 0,
        totalForecast: 0,
        totalActual: 0,
      }
    );
  }

  private buildCharts(aggregate: DemandAnalysisAggregate | null): DemandAnalysisCharts {
    if (!aggregate) {
      return {
        forecastVsActual: [],
        topVolume: [],
        topValue: [],
        growthRanking: [],
        declineRanking: [],
        regionalTrend: [],
        channelTrend: [],
      };
    }

    return {
      forecastVsActual: this.buildTrendChart(aggregate.details),
      topVolume: this.buildTopRanking(aggregate.details, 'ventaReal'),
      topValue: this.buildTopRanking(aggregate.details, 'valorVenta'),
      growthRanking: this.buildGrowthRanking(aggregate.details, 'CRECE'),
      declineRanking: this.buildGrowthRanking(aggregate.details, 'CAE'),
      regionalTrend: this.buildRegionalTrend(aggregate.details, 'zona'),
      channelTrend: this.buildRegionalTrend(aggregate.details, 'canal'),
    };
  }

  private buildTrendChart(details: DemandAnalysisDetail[]): DemandAnalysisTrendPoint[] {
    const map = new Map<string, DemandAnalysisTrendPoint>();

    details.forEach((detail) => {
      const current = map.get(detail.periodo) ?? {
        label: detail.periodo,
        forecast: 0,
        actual: 0,
      };
      current.forecast += detail.forecast;
      current.actual += detail.ventaReal;
      map.set(detail.periodo, current);
    });

    return Array.from(map.values()).slice(0, 12);
  }

  private buildTopRanking(
    details: DemandAnalysisDetail[],
    metric: 'ventaReal' | 'valorVenta',
  ): DemandAnalysisRankingPoint[] {
    const map = new Map<string, { label: string; value: number; auxValue: number }>();

    details.forEach((detail) => {
      const current = map.get(detail.skuId) ?? {
        label: `${detail.sku} · ${detail.productoNombre}`,
        value: 0,
        auxValue: 0,
      };
      current.value += detail[metric];
      current.auxValue += detail.forecast;
      map.set(detail.skuId, current);
    });

    return Array.from(map.values())
      .map((item) => ({ label: item.label, value: Math.round(item.value), auxValue: Math.round(item.auxValue) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  private buildGrowthRanking(
    details: DemandAnalysisDetail[],
    trend: 'CRECE' | 'CAE',
  ): DemandAnalysisRankingPoint[] {
    const filtered = details.filter((detail) => detail.tendencia === trend);

    return filtered
      .map((detail) => ({
        label: `${detail.sku} · ${detail.zona}`,
        value: Math.abs(detail.desviacionPct),
        auxValue: detail.valorVenta,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  private buildRegionalTrend(
    details: DemandAnalysisDetail[],
    key: 'zona' | 'canal',
  ): DemandAnalysisRegionalPoint[] {
    const map = new Map<string, DemandAnalysisRegionalPoint>();

    details.forEach((detail) => {
      const label = detail[key];
      const current = map.get(label) ?? {
        label,
        forecast: 0,
        actual: 0,
        gapPct: 0,
      };
      current.forecast += detail.forecast;
      current.actual += detail.ventaReal;
      map.set(label, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        gapPct: item.forecast ? Math.round(((item.actual - item.forecast) / item.forecast) * 100) : 0,
      }))
      .sort((left, right) => Math.abs(right.gapPct) - Math.abs(left.gapPct))
      .slice(0, 6);
  }

  private cloneAggregate(
    aggregate: DemandAnalysisAggregate,
    severity: DemandAnalysisAlertSeverity | 'TODAS',
  ): DemandAnalysisAggregate {
    return {
      analysis: {
        ...aggregate.analysis,
        resumenKpis: { ...aggregate.analysis.resumenKpis },
      },
      details: aggregate.details.map((detail) => ({ ...detail })),
      alerts: aggregate.alerts
        .filter((alert) => severity === 'TODAS' || alert.severidad === severity)
        .map((alert) => ({ ...alert })),
    };
  }

  private matchesAnalysisFilters(aggregate: DemandAnalysisAggregate, filters: DemandAnalysisFilters): boolean {
    const matchesForecast = !filters.selectedForecastId || aggregate.analysis.forecastBaseId === filters.selectedForecastId;
    const matchesChannel =
      !filters.canal || aggregate.details.some((detail) => detail.canal === filters.canal);
    const matchesZone = !filters.zona || aggregate.details.some((detail) => detail.zona === filters.zona);
    const matchesSegment =
      !filters.segmento || aggregate.details.some((detail) => detail.segmento === filters.segmento);
    const matchesClient =
      !filters.clienteId || aggregate.details.some((detail) => detail.clienteId === filters.clienteId);
    const matchesSku =
      !filters.skuIds.length || filters.skuIds.some((skuId) => aggregate.details.some((detail) => detail.skuId === skuId));

    return matchesForecast && matchesChannel && matchesZone && matchesSegment && matchesClient && matchesSku;
  }

  private matchesForecastDetail(
    detail: DemandForecastDetail,
    filters: DemandAnalysisFilters,
    products: Map<string, Product>,
  ): boolean {
    const product = products.get(detail.skuId);

    return (
      (!filters.skuIds.length || filters.skuIds.includes(detail.skuId)) &&
      (!filters.canal || detail.canal === filters.canal) &&
      (!filters.zona || detail.zona === filters.zona) &&
      (!filters.segmento || detail.segmento === filters.segmento) &&
      (!filters.clienteId || detail.clienteId === filters.clienteId) &&
      (!filters.onlyActiveProducts || product?.estado !== 'INACTIVO')
    );
  }

  private normalizeFilters(filters: DemandAnalysisFilters): DemandAnalysisFilters {
    return {
      ...DEFAULT_DEMAND_ANALYSIS_FILTERS,
      ...filters,
      skuIds: filters.skuIds ?? [],
      canal: filters.canal ?? null,
      zona: filters.zona ?? null,
      segmento: filters.segmento ?? null,
      clienteId: filters.clienteId ?? null,
      selectedForecastId: filters.selectedForecastId ?? null,
      alertSeverity: filters.alertSeverity ?? 'TODAS',
    };
  }

  private calculateActualSales(detail: DemandForecastDetail, forecastVersion: number): number {
    const base = detail.forecastFinal;
    const volatilitySeed = this.hashValue(`${detail.skuId}-${detail.zona}-${detail.canal}-${detail.periodo}-${forecastVersion}`);
    const scenario = volatilitySeed % 4;
    const pct =
      scenario === 0
        ? 1.12 + (volatilitySeed % 6) / 100
        : scenario === 1
          ? 0.82 + (volatilitySeed % 8) / 100
          : scenario === 2
            ? 0.97 + (volatilitySeed % 4) / 100
            : 1.04 + (volatilitySeed % 5) / 100;
    const regionalFactor = detail.zona.includes('norte') ? 1.03 : 0.98;
    const channelFactor = detail.canal.includes('Mayorista')
      ? 1.05
      : detail.canal.includes('Institucional')
        ? 0.93
        : 1;

    return Math.max(1, Math.round(base * pct * regionalFactor * channelFactor));
  }

  private resolveUnitValue(product: Product | null, detail: DemandForecastDetail): number {
    if (product?.precioNeto) {
      return product.precioNeto;
    }

    if (product?.precioBruto) {
      return product.precioBruto;
    }

    return 2400 + (this.hashValue(detail.sku) % 1800);
  }

  private resolvePrimaryAlert(
    deviationPct: number,
    trend: DemandAnalysisDetail['tendencia'],
    variability: number,
  ): string | null {
    if (Math.abs(deviationPct) >= 22) {
      return 'DESVIACION_ALTA';
    }

    if (trend === 'CAE') {
      return 'CAIDA_DEMANDA';
    }

    if (trend === 'CRECE') {
      return 'CRECIMIENTO_ATIPICO';
    }

    if (variability >= 30) {
      return 'ALTA_VARIABILIDAD';
    }

    return null;
  }

  private resolveSegment(client: Client): string {
    const source = this.normalizeText(`${client.nombre} ${client.nombreComercial ?? ''}`);

    if (source.includes('super') || source.includes('mercad')) return 'Supermercado';
    if (source.includes('distrib')) return 'Distribuidor';
    if (source.includes('hospital') || source.includes('clinica') || source.includes('fundacion')) return 'Institucional';
    if (source.includes('tienda') || source.includes('barrio') || source.includes('faro')) return 'Tienda de barrio';
    return 'Cliente clave';
  }

  private mapOptions(values: Iterable<string>): Array<{ value: string; label: string }> {
    return Array.from(new Set(Array.from(values).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'es-CO'))
      .map((value) => ({ value, label: value }));
  }

  private buildAnalysisId(companyId: string, forecastId: string): string {
    return `demand-analysis-${companyId}-${forecastId}`;
  }

  private buildAuditDraft(
    action: DemandAnalysisAuditDraft['action'],
    aggregate: DemandAnalysisAggregate,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): DemandAnalysisAuditDraft {
    return {
      module: 'analisis-demanda',
      action,
      companyId: aggregate.analysis.empresaId,
      companyName: aggregate.analysis.empresaNombre,
      entityId: aggregate.analysis.id,
      entityName: aggregate.analysis.forecastBaseId,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAggregate(aggregate: DemandAnalysisAggregate): Record<string, unknown> {
    return {
      analysis: {
        id: aggregate.analysis.id,
        forecastBaseId: aggregate.analysis.forecastBaseId,
        resumenKpis: { ...aggregate.analysis.resumenKpis },
      },
      details: aggregate.details.slice(0, 12).map((detail) => ({
        sku: detail.sku,
        periodo: detail.periodo,
        forecast: detail.forecast,
        ventaReal: detail.ventaReal,
        desviacionPct: detail.desviacionPct,
        mape: detail.mape,
      })),
      alerts: aggregate.alerts.slice(0, 8).map((alert) => ({ ...alert })),
    };
  }

  private hashValue(value: string): number {
    return value.split('').reduce((hash, character) => hash + character.charCodeAt(0), 0);
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
