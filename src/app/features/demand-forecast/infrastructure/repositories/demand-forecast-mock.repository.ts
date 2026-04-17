import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Client } from '../../../clients/domain/models/client.model';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Route } from '../../../routes/domain/models/route.model';
import { RouteStore } from '../../../routes/domain/models/route-response.model';
import { INITIAL_ROUTES_STORE } from '../../../routes/infrastructure/data/routes.mock';
import { Vendor } from '../../../vendors/domain/models/vendor.model';
import { VendorStore } from '../../../vendors/domain/models/vendor-response.model';
import { INITIAL_VENDORS_STORE } from '../../../vendors/infrastructure/data/vendors.mock';
import { DemandAlert, DemandAlertSeverity } from '../../domain/models/demand-alert.model';
import { DemandForecastDetail } from '../../domain/models/demand-forecast-detail.model';
import { DemandForecastEvent } from '../../domain/models/demand-forecast-event.model';
import {
  DEFAULT_DEMAND_FORECAST_FILTERS,
  DemandForecastFilters,
} from '../../domain/models/demand-forecast-filters.model';
import {
  ApplyDemandForecastAdjustmentPayload,
  ApproveDemandForecastPayload,
  DemandClientOption,
  DemandDistributionPoint,
  DemandForecast,
  DemandForecastAggregate,
  DemandForecastCatalogOption,
  DemandForecastCatalogs,
  DemandForecastCharts,
  DemandForecastKpis,
  DemandRiskPoint,
  DemandForecastTrendPoint,
  GenerateDemandForecastPayload,
} from '../../domain/models/demand-forecast.model';
import {
  DemandForecastAuditDraft,
  DemandForecastDashboard,
  DemandForecastMutationResult,
  DemandForecastStore,
} from '../../domain/models/demand-forecast-response.model';
import { DemandForecastRepository } from '../../domain/repositories/demand-forecast.repository';

type DemandSegment =
  | 'Tienda de barrio'
  | 'Supermercado'
  | 'Distribuidor'
  | 'Institucional'
  | 'Cliente clave';

interface DemandBaseCatalogs {
  channels: string[];
  zones: string[];
  segments: DemandSegment[];
}

const STORAGE_KEY = 'medussa.erp.mock.demand-forecasts';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const CLIENTS_STORAGE_KEY = 'medussa.erp.mock.clients';
const VENDORS_STORAGE_KEY = 'medussa.erp.mock.vendors';
const ROUTES_STORAGE_KEY = 'medussa.erp.mock.routes';

const EL_ARBOLITO_NAME = 'Industrias Alimenticias El Arbolito';
const BASE_CATALOGS: DemandBaseCatalogs = {
  channels: [
    'Tradicional / TAT',
    'Mayorista / Distribuidor',
    'Institucional',
    'Cadenas / Autoservicios',
  ],
  zones: ['Zona norte 1', 'Zona norte 2', 'Zona sur 1', 'Zona sur 2', 'Zona sur 3'],
  segments: [
    'Tienda de barrio',
    'Supermercado',
    'Distribuidor',
    'Institucional',
    'Cliente clave',
  ],
};

@Injectable({
  providedIn: 'root',
})
export class DemandForecastMockRepository implements DemandForecastRepository {
  getCatalogs(companyId: string): Observable<DemandForecastCatalogs> {
    return of(this.buildCatalogs(companyId)).pipe(delay(100));
  }

  getDashboard(companyId: string, filters: DemandForecastFilters): Observable<DemandForecastDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureCompanyBaseline(this.readStore(), companyId);
    const catalogs = this.buildCatalogs(companyId);
    const forecasts = store.forecasts
      .filter((aggregate) => aggregate.forecast.empresaId === companyId)
      .filter((aggregate) => this.matchesForecastFilters(aggregate, normalizedFilters))
      .sort((left, right) => this.sortByVersion(right.forecast, left.forecast));
    const selectedForecast =
      forecasts.find((aggregate) => aggregate.forecast.id === normalizedFilters.selectedForecastId) ??
      forecasts[0] ??
      null;

    return of({
      filters: normalizedFilters,
      catalogs,
      forecasts: forecasts.map((aggregate) => this.cloneAggregate(aggregate, normalizedFilters.alertSeverity)),
      selectedForecast: selectedForecast
        ? this.cloneAggregate(selectedForecast, normalizedFilters.alertSeverity)
        : null,
      kpis: this.buildKpis(selectedForecast),
      charts: this.buildCharts(selectedForecast),
    }).pipe(delay(180));
  }

  generateForecast(
    companyId: string,
    payload: GenerateDemandForecastPayload,
  ): Observable<DemandForecastMutationResult> {
    const store = this.ensureCompanyBaseline(this.readStore(), companyId);
    const validationError = this.validateGenerationPayload(companyId, payload);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const companyName = this.resolveCompanyName(companyId);
    const nextVersion = this.getNextVersion(store, companyId);
    const aggregate = this.buildForecastAggregate(companyId, companyName, payload, nextVersion);
    const auditDraft = this.buildAuditDraft(
      'generate',
      aggregate,
      `Generacion del forecast ${aggregate.forecast.nombreForecast}.`,
      null,
      this.sanitizeAggregate(aggregate),
    );

    this.writeStore({
      ...store,
      forecasts: [aggregate, ...store.forecasts],
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DemandForecastMutationResult>({
      action: 'generated',
      forecast: this.cloneAggregate(aggregate, 'TODAS'),
      message: `Forecast ${aggregate.forecast.nombreForecast} generado para ${companyName}.`,
      auditDraft,
    }).pipe(delay(260));
  }

  applyAdjustment(
    companyId: string,
    forecastId: string,
    payload: ApplyDemandForecastAdjustmentPayload,
  ): Observable<DemandForecastMutationResult> {
    const store = this.ensureCompanyBaseline(this.readStore(), companyId);
    const currentAggregate = store.forecasts.find(
      (aggregate) => aggregate.forecast.empresaId === companyId && aggregate.forecast.id === forecastId,
    );

    if (!currentAggregate) {
      return throwError(() => new Error('No se encontro el forecast seleccionado.'));
    }

    const updatedAggregate = this.applyAdjustmentToAggregate(currentAggregate, payload);
    const auditDraft = this.buildAuditDraft(
      'adjust',
      updatedAggregate,
      `Ajuste comercial aplicado sobre ${updatedAggregate.forecast.nombreForecast}.`,
      this.sanitizeAggregate(currentAggregate),
      this.sanitizeAggregate(updatedAggregate),
    );

    this.writeStore({
      ...store,
      forecasts: store.forecasts.map((aggregate) =>
        aggregate.forecast.id === forecastId ? updatedAggregate : aggregate,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DemandForecastMutationResult>({
      action: 'adjusted',
      forecast: this.cloneAggregate(updatedAggregate, 'TODAS'),
      message: `Se registro el ajuste comercial en ${updatedAggregate.forecast.nombreForecast}.`,
      auditDraft,
    }).pipe(delay(220));
  }

  approveForecast(
    companyId: string,
    forecastId: string,
    payload: ApproveDemandForecastPayload,
  ): Observable<DemandForecastMutationResult> {
    const store = this.ensureCompanyBaseline(this.readStore(), companyId);
    const currentAggregate = store.forecasts.find(
      (aggregate) => aggregate.forecast.empresaId === companyId && aggregate.forecast.id === forecastId,
    );

    if (!currentAggregate) {
      return throwError(() => new Error('No se encontro el forecast seleccionado.'));
    }

    if (currentAggregate.forecast.estado === 'APROBADO') {
      return throwError(() => new Error('El forecast ya se encuentra aprobado.'));
    }

    const approvedAggregate = this.approveAggregate(currentAggregate, payload);
    const auditDraft = this.buildAuditDraft(
      'approve',
      approvedAggregate,
      `Aprobacion del forecast ${approvedAggregate.forecast.nombreForecast}.`,
      this.sanitizeAggregate(currentAggregate),
      this.sanitizeAggregate(approvedAggregate),
    );

    this.writeStore({
      ...store,
      forecasts: store.forecasts.map((aggregate) => {
        if (aggregate.forecast.empresaId !== companyId) {
          return aggregate;
        }

        if (aggregate.forecast.id === forecastId) {
          return approvedAggregate;
        }

        return {
          ...aggregate,
          forecast: {
            ...aggregate.forecast,
            isOfficialVersion: false,
          },
        };
      }),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DemandForecastMutationResult>({
      action: 'approved',
      forecast: this.cloneAggregate(approvedAggregate, 'TODAS'),
      message: `Version oficial actualizada con ${approvedAggregate.forecast.nombreForecast}.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): DemandForecastStore {
    if (typeof window === 'undefined') {
      return { forecasts: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const initialStore: DemandForecastStore = { forecasts: [], auditTrail: [] };
      this.writeStore(initialStore);
      return initialStore;
    }

    try {
      const parsed = JSON.parse(raw) as DemandForecastStore;
      return {
        forecasts: parsed.forecasts ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const fallbackStore: DemandForecastStore = { forecasts: [], auditTrail: [] };
      this.writeStore(fallbackStore);
      return fallbackStore;
    }
  }

  private writeStore(store: DemandForecastStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

  private readVendors(): Vendor[] {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_VENDORS_STORE.vendors);
    }

    const raw = localStorage.getItem(VENDORS_STORAGE_KEY);

    if (!raw) {
      return structuredClone(INITIAL_VENDORS_STORE.vendors);
    }

    try {
      return (JSON.parse(raw) as VendorStore).vendors ?? structuredClone(INITIAL_VENDORS_STORE.vendors);
    } catch {
      return structuredClone(INITIAL_VENDORS_STORE.vendors);
    }
  }

  private readRoutes(): Route[] {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_ROUTES_STORE.routes);
    }

    const raw = localStorage.getItem(ROUTES_STORAGE_KEY);

    if (!raw) {
      return structuredClone(INITIAL_ROUTES_STORE.routes);
    }

    try {
      return (JSON.parse(raw) as RouteStore).routes ?? structuredClone(INITIAL_ROUTES_STORE.routes);
    } catch {
      return structuredClone(INITIAL_ROUTES_STORE.routes);
    }
  }

  private ensureCompanyBaseline(store: DemandForecastStore, companyId: string): DemandForecastStore {
    const hasCompanyForecasts = store.forecasts.some((aggregate) => aggregate.forecast.empresaId === companyId);

    if (hasCompanyForecasts) {
      return store;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const aggregate = this.buildForecastAggregate(
      companyId,
      this.resolveCompanyName(companyId),
      {
        horizonte: 'MENSUAL',
        fechaInicio: this.toIsoDate(firstDay),
        fechaFin: this.toIsoDate(lastDay),
        skuIds: [],
        canal: null,
        zona: null,
        segmento: null,
        clienteId: null,
        includeOnlyActiveProducts: true,
        nombreForecast: 'Base operativa SCM',
        observaciones: 'Version base creada para planeacion de demanda en entorno local.',
        usuario: 'demo.el-arbolito',
      },
      1,
      true,
    );
    const auditDraft = this.buildAuditDraft(
      'generate',
      aggregate,
      `Seed inicial de demand planning para ${aggregate.forecast.empresaNombre}.`,
      null,
      this.sanitizeAggregate(aggregate),
    );
    const nextStore = {
      ...store,
      forecasts: [aggregate, ...store.forecasts],
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);

    return nextStore;
  }

  private buildCatalogs(companyId: string): DemandForecastCatalogs {
    const products = this.readProducts()
      .filter((product) => product.empresaId === companyId)
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const clients = this.readClients()
      .filter((client) => client.empresaId === companyId)
      .filter((client) => client.estado === 'ACTIVO')
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const vendors = this.readVendors()
      .filter((vendor) => vendor.empresaId === companyId)
      .filter((vendor) => vendor.estado === 'ACTIVO');
    const routes = this.readRoutes()
      .filter((route) => route.empresaId === companyId)
      .filter((route) => route.estado === 'ACTIVO');
    const channels = new Set([...BASE_CATALOGS.channels, ...vendors.map((vendor) => vendor.canal).filter(Boolean)]);
    const zones = new Set([...BASE_CATALOGS.zones, ...routes.map((route) => route.zona).filter(Boolean)]);
    const segments = new Set<DemandSegment>([
      ...BASE_CATALOGS.segments,
      ...clients.map((client) => this.resolveClientSegment(client)),
    ]);

    return {
      horizons: [
        { value: 'DIARIO', label: 'Diario' },
        { value: 'SEMANAL', label: 'Semanal' },
        { value: 'MENSUAL', label: 'Mensual' },
      ],
      channels: this.mapOptions(channels),
      zones: this.mapOptions(zones),
      segments: this.mapOptions(segments),
      products: products.map((product) => ({
        value: product.id,
        label: `${product.sku} · ${product.nombre}`,
      })),
      clients: clients.map((client): DemandClientOption => ({
        value: client.id,
        label: `${client.idCliente} · ${client.nombre}`,
        zone: client.zona?.trim() || this.getZoneByIndex(this.hashValue(client.nombre), BASE_CATALOGS.zones),
        segment: this.resolveClientSegment(client),
      })),
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private buildForecastAggregate(
    companyId: string,
    companyName: string,
    payload: GenerateDemandForecastPayload,
    version: number,
    approved = false,
  ): DemandForecastAggregate {
    const periods = this.buildPeriods(payload.fechaInicio, payload.fechaFin, payload.horizonte);
    const products = this.resolveProducts(companyId, payload);
    const clients = this.readClients()
      .filter((client) => client.empresaId === companyId)
      .filter((client) => client.estado === 'ACTIVO');
    const vendorByZone = new Map(
      this.readVendors()
        .filter((vendor) => vendor.empresaId === companyId)
        .filter((vendor) => vendor.estado === 'ACTIVO')
        .map((vendor) => [vendor.zona, vendor]),
    );
    const clientMap = new Map(clients.map((client) => [client.id, client]));
    const details: DemandForecastDetail[] = [];

    products.forEach((product, productIndex) => {
      periods.forEach((period, periodIndex) => {
        const client = this.resolveClientForDetail(payload, clients, productIndex, periodIndex, clientMap);
        const zone =
          payload.zona ||
          client?.zona?.trim() ||
          this.getZoneByIndex(this.hashValue(`${product.id}-${period}`), BASE_CATALOGS.zones);
        const segment = payload.segmento || (client ? this.resolveClientSegment(client) : 'Tienda de barrio');
        const channel = payload.canal || vendorByZone.get(zone)?.canal || this.resolveChannel(zone, product);
        const baseDemand = this.calculateBaseDemand(product, zone, channel, segment, periodIndex);
        const historical = Math.max(8, Math.round(baseDemand * 0.9));
        const systemForecast = Math.max(10, Math.round(baseDemand));
        const inventory = this.calculateInventory(product, zone, productIndex);
        const safetyStock = this.calculateSafetyStock(product, systemForecast);
        const finalForecast = systemForecast;
        const coverage = this.calculateCoverageDays(inventory, finalForecast, payload.horizonte);
        const confidence = this.calculateConfidence(product, zone, periodIndex, 0);

        details.push({
          id: `${version}-${product.id}-${periodIndex}`,
          forecastId: `forecast-${companyId}-${version}`,
          skuId: product.id,
          sku: product.sku,
          productoNombre: product.nombre,
          canal: channel,
          zona: zone,
          segmento: segment,
          clienteId: client?.id ?? null,
          clienteNombre: client?.nombre ?? null,
          periodo: period,
          demandaHistorica: historical,
          forecastSistema: systemForecast,
          ajusteManual: 0,
          forecastFinal: finalForecast,
          inventarioActual: inventory,
          stockSeguridad: safetyStock,
          coberturaDias: coverage,
          riesgoFaltante: inventory < finalForecast + safetyStock,
          riesgoSobrestock: inventory > finalForecast * 2.2 + safetyStock,
          confianzaForecast: confidence,
          observacionAjuste: null,
        });
      });
    });

    const alerts = this.buildAlerts(companyId, companyName, details, []);
    const forecast: DemandForecast = {
      id: `forecast-${companyId}-${version}`,
      empresaId: companyId,
      empresaNombre: companyName,
      version,
      nombreForecast: payload.nombreForecast?.trim() || `Forecast ${payload.horizonte.toLowerCase()} v${version}`,
      horizonte: payload.horizonte,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      estado: approved ? 'APROBADO' : 'GENERADO',
      isOfficialVersion: approved,
      canal: payload.canal,
      zona: payload.zona,
      segmento: payload.segmento,
      clienteId: payload.clienteId,
      clienteNombre: payload.clienteId ? clientMap.get(payload.clienteId)?.nombre ?? null : null,
      skuFiltro: products.map((product) => product.id),
      periodos: periods,
      usuarioCrea: payload.usuario,
      usuarioAprueba: approved ? payload.usuario : null,
      fechaCreacion: new Date().toISOString(),
      fechaAprobacion: approved ? new Date().toISOString() : null,
      observaciones: payload.observaciones?.trim() || null,
      alertasResumen: this.buildAlertSummary(alerts),
      metricasResumen: this.buildMetricsSummary(details),
    };

    return {
      forecast,
      details,
      events: [],
      alerts,
    };
  }

  private applyAdjustmentToAggregate(
    aggregate: DemandForecastAggregate,
    payload: ApplyDemandForecastAdjustmentPayload,
  ): DemandForecastAggregate {
    const event: DemandForecastEvent = {
      id: `event-${aggregate.forecast.id}-${aggregate.events.length + 1}`,
      forecastId: aggregate.forecast.id,
      tipoEvento: payload.tipoEvento.trim() || 'Promocion comercial',
      descripcion: payload.descripcion.trim(),
      impactoPorcentaje: payload.impactoPorcentaje,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      skuId: payload.skuId ?? null,
      canal: payload.canal ?? null,
      zona: payload.zona ?? null,
      segmento: payload.segmento ?? null,
      periodo: payload.periodo ?? null,
      observacion: payload.observacion ?? null,
      createdAt: new Date().toISOString(),
      createdBy: payload.usuario,
    };
    const periods = new Set(this.buildPeriods(payload.fechaInicio, payload.fechaFin, aggregate.forecast.horizonte));
    const details = aggregate.details.map((detail) => {
      if (!this.matchesAdjustment(detail, payload, periods)) {
        return { ...detail };
      }

      const manualDelta = Math.round(detail.forecastSistema * (payload.impactoPorcentaje / 100));
      const forecastFinal = Math.max(0, detail.forecastSistema + manualDelta);
      const coverage = this.calculateCoverageDays(
        detail.inventarioActual,
        forecastFinal,
        aggregate.forecast.horizonte,
      );

      return {
        ...detail,
        ajusteManual: detail.ajusteManual + manualDelta,
        forecastFinal,
        coberturaDias: coverage,
        riesgoFaltante: detail.inventarioActual < forecastFinal + detail.stockSeguridad,
        riesgoSobrestock: detail.inventarioActual > forecastFinal * 2.2 + detail.stockSeguridad,
        confianzaForecast: this.calculateConfidence(
          { familia: 'Producto terminado' } as Product,
          detail.zona,
          0,
          Math.abs(payload.impactoPorcentaje),
        ),
        observacionAjuste: payload.observacion?.trim() || payload.descripcion.trim(),
      };
    });
    const events = [event, ...aggregate.events];
    const alerts = this.buildAlerts(aggregate.forecast.empresaId, aggregate.forecast.empresaNombre, details, events);

    return {
      forecast: {
        ...aggregate.forecast,
        estado: 'AJUSTADO',
        isOfficialVersion: false,
        observaciones: payload.observacion?.trim() || aggregate.forecast.observaciones || null,
        alertasResumen: this.buildAlertSummary(alerts),
        metricasResumen: this.buildMetricsSummary(details),
      },
      details,
      events,
      alerts,
    };
  }

  private approveAggregate(
    aggregate: DemandForecastAggregate,
    payload: ApproveDemandForecastPayload,
  ): DemandForecastAggregate {
    return {
      ...aggregate,
      forecast: {
        ...aggregate.forecast,
        estado: 'APROBADO',
        isOfficialVersion: true,
        usuarioAprueba: payload.usuario,
        fechaAprobacion: new Date().toISOString(),
        observaciones: payload.observaciones?.trim() || aggregate.forecast.observaciones || null,
      },
    };
  }

  private resolveProducts(companyId: string, payload: GenerateDemandForecastPayload): Product[] {
    return this.readProducts()
      .filter((product) => product.empresaId === companyId)
      .filter((product) => !payload.includeOnlyActiveProducts || product.estado === 'ACTIVO')
      .filter((product) => !payload.skuIds.length || payload.skuIds.includes(product.id))
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'))
      .slice(0, 12);
  }

  private resolveClientForDetail(
    payload: GenerateDemandForecastPayload,
    clients: Client[],
    productIndex: number,
    periodIndex: number,
    clientMap: Map<string, Client>,
  ): Client | null {
    if (payload.clienteId) {
      return clientMap.get(payload.clienteId) ?? null;
    }

    const filteredClients = clients.filter((client) => {
      const zone = client.zona?.trim() || '';
      const segment = this.resolveClientSegment(client);

      return (!payload.zona || zone === payload.zona) && (!payload.segmento || segment === payload.segmento);
    });

    if (!filteredClients.length) {
      return null;
    }

    return filteredClients[(productIndex + periodIndex) % filteredClients.length] ?? null;
  }

  private buildAlerts(
    companyId: string,
    companyName: string,
    details: DemandForecastDetail[],
    events: DemandForecastEvent[],
  ): DemandAlert[] {
    const alerts: DemandAlert[] = [];

    details.forEach((detail) => {
      if (detail.riesgoFaltante) {
        alerts.push({
          id: `alert-shortage-${detail.id}`,
          forecastId: detail.forecastId,
          detailId: detail.id,
          companyId,
          companyName,
          type: 'RIESGO_FALTANTE',
          severity: detail.stockSeguridad > detail.inventarioActual ? 'ALTA' : 'MEDIA',
          skuId: detail.skuId,
          sku: detail.sku,
          productName: detail.productoNombre,
          zone: detail.zona,
          channel: detail.canal,
          segment: detail.segmento,
          period: detail.periodo,
          title: 'Riesgo de faltante',
          description: `Inventario ${detail.inventarioActual} vs necesidad ${detail.forecastFinal + detail.stockSeguridad}.`,
          metricValue: detail.forecastFinal + detail.stockSeguridad - detail.inventarioActual,
        });
      }

      if (detail.riesgoSobrestock) {
        alerts.push({
          id: `alert-over-${detail.id}`,
          forecastId: detail.forecastId,
          detailId: detail.id,
          companyId,
          companyName,
          type: 'RIESGO_SOBRESTOCK',
          severity: detail.inventarioActual > detail.forecastFinal * 2.8 ? 'ALTA' : 'MEDIA',
          skuId: detail.skuId,
          sku: detail.sku,
          productName: detail.productoNombre,
          zone: detail.zona,
          channel: detail.canal,
          segment: detail.segmento,
          period: detail.periodo,
          title: 'Riesgo de sobrestock',
          description: `Cobertura alta con ${detail.coberturaDias} dias de inventario.`,
          metricValue: detail.inventarioActual - detail.forecastFinal,
        });
      }

      if (detail.confianzaForecast < 74) {
        alerts.push({
          id: `alert-confidence-${detail.id}`,
          forecastId: detail.forecastId,
          detailId: detail.id,
          companyId,
          companyName,
          type: 'BAJA_CONFIANZA',
          severity: detail.confianzaForecast < 68 ? 'ALTA' : 'BAJA',
          skuId: detail.skuId,
          sku: detail.sku,
          productName: detail.productoNombre,
          zone: detail.zona,
          channel: detail.canal,
          segment: detail.segmento,
          period: detail.periodo,
          title: 'Confianza baja',
          description: `Confianza estimada en ${detail.confianzaForecast}%.`,
          metricValue: detail.confianzaForecast,
        });
      }

      if (Math.abs(detail.ajusteManual) >= Math.max(10, detail.forecastSistema * 0.18)) {
        alerts.push({
          id: `alert-adjustment-${detail.id}`,
          forecastId: detail.forecastId,
          detailId: detail.id,
          companyId,
          companyName,
          type: 'AJUSTE_RELEVANTE',
          severity: Math.abs(detail.ajusteManual) > detail.forecastSistema * 0.32 ? 'ALTA' : 'MEDIA',
          skuId: detail.skuId,
          sku: detail.sku,
          productName: detail.productoNombre,
          zone: detail.zona,
          channel: detail.canal,
          segment: detail.segmento,
          period: detail.periodo,
          title: 'Ajuste comercial relevante',
          description: `Ajuste manual de ${detail.ajusteManual} unidades aplicado al forecast.`,
          metricValue: detail.ajusteManual,
        });
      }
    });

    if (events.length && !alerts.some((alert) => alert.type === 'AJUSTE_RELEVANTE')) {
      const latestEvent = events[0];
      alerts.push({
        id: `alert-event-${latestEvent.id}`,
        forecastId: latestEvent.forecastId,
        companyId,
        companyName,
        type: 'AJUSTE_RELEVANTE',
        severity: Math.abs(latestEvent.impactoPorcentaje) >= 20 ? 'ALTA' : 'MEDIA',
        title: latestEvent.tipoEvento,
        description: latestEvent.descripcion,
        metricValue: latestEvent.impactoPorcentaje,
      });
    }

    return alerts;
  }

  private buildKpis(aggregate: DemandForecastAggregate | null): DemandForecastKpis {
    if (!aggregate) {
      return {
        totalSkus: 0,
        totalForecast: 0,
        shortageAlerts: 0,
        overstockAlerts: 0,
        adjustedVsSystemPct: 0,
        averageCoverageDays: 0,
      };
    }

    return {
      totalSkus: aggregate.forecast.metricasResumen.totalSku,
      totalForecast: aggregate.forecast.metricasResumen.totalForecast,
      shortageAlerts: aggregate.forecast.alertasResumen.shortage,
      overstockAlerts: aggregate.forecast.alertasResumen.overstock,
      adjustedVsSystemPct: aggregate.forecast.metricasResumen.adjustedVsSystemPct,
      averageCoverageDays: aggregate.forecast.metricasResumen.averageCoverageDays,
    };
  }

  private buildCharts(aggregate: DemandForecastAggregate | null): DemandForecastCharts {
    if (!aggregate) {
      return {
        trend: [],
        zoneDistribution: [],
        channelDistribution: [],
        topRiskSkus: [],
      };
    }

    return {
      trend: this.buildTrendChart(aggregate.details),
      zoneDistribution: this.buildDistributionChart(aggregate.details, 'zona'),
      channelDistribution: this.buildDistributionChart(aggregate.details, 'canal'),
      topRiskSkus: this.buildRiskChart(aggregate.details),
    };
  }

  private buildTrendChart(details: DemandForecastDetail[]): DemandForecastTrendPoint[] {
    const periodMap = new Map<string, DemandForecastTrendPoint>();

    details.forEach((detail) => {
      const current = periodMap.get(detail.periodo) ?? {
        label: detail.periodo,
        historical: 0,
        system: 0,
        final: 0,
      };
      current.historical += detail.demandaHistorica;
      current.system += detail.forecastSistema;
      current.final += detail.forecastFinal;
      periodMap.set(detail.periodo, current);
    });

    return Array.from(periodMap.values()).slice(0, 12);
  }

  private buildDistributionChart(
    details: DemandForecastDetail[],
    key: 'zona' | 'canal',
  ): DemandDistributionPoint[] {
    const map = new Map<string, number>();

    details.forEach((detail) => {
      map.set(detail[key], (map.get(detail[key]) ?? 0) + detail.forecastFinal);
    });

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }

  private buildRiskChart(details: DemandForecastDetail[]): DemandRiskPoint[] {
    return details
      .filter((detail) => detail.riesgoFaltante || detail.riesgoSobrestock)
      .map((detail): DemandRiskPoint => ({
        label: detail.sku,
        value: detail.riesgoFaltante
          ? detail.forecastFinal + detail.stockSeguridad - detail.inventarioActual
          : detail.inventarioActual - detail.forecastFinal,
        type: detail.riesgoFaltante ? 'FALTANTE' : 'SOBRESTOCK',
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  private cloneAggregate(
    aggregate: DemandForecastAggregate,
    severity: DemandAlertSeverity | 'TODAS',
  ): DemandForecastAggregate {
    return {
      forecast: {
        ...aggregate.forecast,
        skuFiltro: [...aggregate.forecast.skuFiltro],
        periodos: [...aggregate.forecast.periodos],
        alertasResumen: { ...aggregate.forecast.alertasResumen },
        metricasResumen: { ...aggregate.forecast.metricasResumen },
      },
      details: aggregate.details.map((detail) => ({ ...detail })),
      events: aggregate.events.map((event) => ({ ...event })),
      alerts: aggregate.alerts
        .filter((alert) => severity === 'TODAS' || alert.severity === severity)
        .map((alert) => ({ ...alert })),
    };
  }

  private normalizeFilters(filters: DemandForecastFilters): DemandForecastFilters {
    return {
      ...DEFAULT_DEMAND_FORECAST_FILTERS,
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

  private matchesForecastFilters(aggregate: DemandForecastAggregate, filters: DemandForecastFilters): boolean {
    const forecast = aggregate.forecast;
    const matchesApproved = !filters.approvedOnly || forecast.estado === 'APROBADO';
    const matchesChannel =
      !filters.canal || forecast.canal === filters.canal || aggregate.details.some((detail) => detail.canal === filters.canal);
    const matchesZone =
      !filters.zona || forecast.zona === filters.zona || aggregate.details.some((detail) => detail.zona === filters.zona);
    const matchesSegment =
      !filters.segmento ||
      forecast.segmento === filters.segmento ||
      aggregate.details.some((detail) => detail.segmento === filters.segmento);
    const matchesClient =
      !filters.clienteId ||
      forecast.clienteId === filters.clienteId ||
      aggregate.details.some((detail) => detail.clienteId === filters.clienteId);
    const matchesSku =
      !filters.skuIds.length ||
      filters.skuIds.some((skuId) => aggregate.details.some((detail) => detail.skuId === skuId));

    return matchesApproved && matchesChannel && matchesZone && matchesSegment && matchesClient && matchesSku;
  }

  private validateGenerationPayload(companyId: string, payload: GenerateDemandForecastPayload): string | null {
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!payload.fechaInicio || !payload.fechaFin) {
      return 'Debes definir un rango de fechas.';
    }

    if (new Date(payload.fechaInicio).getTime() > new Date(payload.fechaFin).getTime()) {
      return 'La fecha inicial no puede ser mayor que la fecha final.';
    }

    const products = this.resolveProducts(companyId, payload);

    if (!products.length) {
      return 'No hay SKU disponibles para generar el forecast con los filtros seleccionados.';
    }

    return null;
  }

  private getNextVersion(store: DemandForecastStore, companyId: string): number {
    return (
      store.forecasts
        .filter((aggregate) => aggregate.forecast.empresaId === companyId)
        .reduce((maxVersion, aggregate) => Math.max(maxVersion, aggregate.forecast.version), 0) + 1
    );
  }

  private sortByVersion(left: DemandForecast, right: DemandForecast): number {
    return (
      left.version - right.version ||
      new Date(left.fechaCreacion).getTime() - new Date(right.fechaCreacion).getTime()
    );
  }

  private buildMetricsSummary(details: DemandForecastDetail[]): DemandForecast['metricasResumen'] {
    const totalForecast = details.reduce((total, detail) => total + detail.forecastFinal, 0);
    const totalSystem = details.reduce((total, detail) => total + detail.forecastSistema, 0);
    const uniqueSku = new Set(details.map((detail) => detail.skuId));
    const totalCoverage = details.reduce((total, detail) => total + detail.coberturaDias, 0);
    const totalConfidence = details.reduce((total, detail) => total + detail.confianzaForecast, 0);

    return {
      totalSku: uniqueSku.size,
      totalForecast,
      adjustedVsSystemPct: totalSystem ? Math.round(((totalForecast - totalSystem) / totalSystem) * 100) : 0,
      averageCoverageDays: details.length ? Math.round(totalCoverage / details.length) : 0,
      confidenceAverage: details.length ? Math.round(totalConfidence / details.length) : 0,
    };
  }

  private buildAlertSummary(alerts: DemandAlert[]): DemandForecast['alertasResumen'] {
    return {
      shortage: alerts.filter((alert) => alert.type === 'RIESGO_FALTANTE').length,
      overstock: alerts.filter((alert) => alert.type === 'RIESGO_SOBRESTOCK').length,
      lowConfidence: alerts.filter((alert) => alert.type === 'BAJA_CONFIANZA').length,
      relevantAdjustments: alerts.filter((alert) => alert.type === 'AJUSTE_RELEVANTE').length,
    };
  }

  private buildAuditDraft(
    action: DemandForecastAuditDraft['action'],
    aggregate: DemandForecastAggregate,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): DemandForecastAuditDraft {
    return {
      module: 'gestion-demanda',
      action,
      companyId: aggregate.forecast.empresaId,
      companyName: aggregate.forecast.empresaNombre,
      entityId: aggregate.forecast.id,
      entityName: aggregate.forecast.nombreForecast,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAggregate(aggregate: DemandForecastAggregate): Record<string, unknown> {
    return {
      forecast: {
        id: aggregate.forecast.id,
        version: aggregate.forecast.version,
        estado: aggregate.forecast.estado,
        horizonte: aggregate.forecast.horizonte,
        fechaInicio: aggregate.forecast.fechaInicio,
        fechaFin: aggregate.forecast.fechaFin,
        isOfficialVersion: aggregate.forecast.isOfficialVersion,
        metricasResumen: { ...aggregate.forecast.metricasResumen },
        alertasResumen: { ...aggregate.forecast.alertasResumen },
      },
      events: aggregate.events.map((event) => ({ ...event })),
      details: aggregate.details.slice(0, 10).map((detail) => ({
        sku: detail.sku,
        periodo: detail.periodo,
        forecastSistema: detail.forecastSistema,
        ajusteManual: detail.ajusteManual,
        forecastFinal: detail.forecastFinal,
        inventarioActual: detail.inventarioActual,
        stockSeguridad: detail.stockSeguridad,
      })),
    };
  }

  private buildPeriods(
    startDate: string,
    endDate: string,
    horizon: GenerateDemandForecastPayload['horizonte'],
  ): string[] {
    const periods: string[] = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const limit = new Date(`${endDate}T00:00:00`);

    while (cursor <= limit && periods.length < 12) {
      if (horizon === 'DIARIO') {
        periods.push(this.toIsoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      if (horizon === 'SEMANAL') {
        const year = cursor.getFullYear();
        const week = this.getWeekNumber(cursor);
        periods.push(`${year}-S${String(week).padStart(2, '0')}`);
        cursor.setDate(cursor.getDate() + 7);
        continue;
      }

      periods.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
      cursor.setMonth(cursor.getMonth() + 1, 1);
    }

    return periods;
  }

  private calculateBaseDemand(
    product: Product,
    zone: string,
    channel: string,
    segment: string,
    periodIndex: number,
  ): number {
    const baseByFamily: Record<string, number> = {
      'Producto terminado': 78,
      'Materia prima': 54,
      Empaque: 34,
      Limpieza: 16,
      Repuestos: 9,
      'Consumo interno': 12,
    };
    const familyBase = baseByFamily[product.familia] ?? 28;
    const zoneFactor = zone.includes('norte') ? 1.05 : 0.97;
    const channelFactor = channel.includes('Mayorista')
      ? 1.18
      : channel.includes('Cadenas')
        ? 1.11
        : channel.includes('Institucional')
          ? 0.94
          : 1;
    const segmentFactor =
      segment === 'Distribuidor' ? 1.15 : segment === 'Supermercado' ? 1.08 : segment === 'Institucional' ? 0.92 : 1;
    const seasonality = 1 + Math.sin((periodIndex + (this.hashValue(product.sku) % 6)) * 0.85) * 0.12;
    const mixFactor = 0.85 + ((this.hashValue(`${product.id}-${zone}-${channel}`) % 26) / 100);

    return familyBase * zoneFactor * channelFactor * segmentFactor * seasonality * mixFactor;
  }

  private calculateInventory(product: Product, zone: string, productIndex: number): number {
    const familyBuffer: Record<string, number> = {
      'Producto terminado': 120,
      'Materia prima': 180,
      Empaque: 140,
      Limpieza: 38,
      Repuestos: 24,
      'Consumo interno': 28,
    };

    return Math.round(
      (familyBuffer[product.familia] ?? 56) +
        (this.hashValue(`${product.id}-${zone}`) % 120) +
        productIndex * 3,
    );
  }

  private calculateSafetyStock(product: Product, forecast: number): number {
    const multiplier =
      product.familia === 'Producto terminado' ? 0.42 : product.familia === 'Materia prima' ? 0.35 : 0.25;
    return Math.max(12, Math.round(forecast * multiplier));
  }

  private calculateCoverageDays(
    inventory: number,
    forecast: number,
    horizon: GenerateDemandForecastPayload['horizonte'],
  ): number {
    const divisor = horizon === 'DIARIO' ? forecast : horizon === 'SEMANAL' ? forecast / 7 : forecast / 30;

    if (divisor <= 0) {
      return 0;
    }

    return Math.round(inventory / divisor);
  }

  private calculateConfidence(product: Product, zone: string, periodIndex: number, adjustmentImpact: number): number {
    const familyWeight = product.familia === 'Producto terminado' ? 84 : product.familia === 'Materia prima' ? 78 : 72;
    const zoneNoise = this.hashValue(`${product.sku}-${zone}-${periodIndex}`) % 11;
    return Math.max(58, Math.min(96, familyWeight - zoneNoise - Math.round(adjustmentImpact * 0.45)));
  }

  private matchesAdjustment(
    detail: DemandForecastDetail,
    payload: ApplyDemandForecastAdjustmentPayload,
    periods: Set<string>,
  ): boolean {
    return (
      (!payload.skuId || detail.skuId === payload.skuId) &&
      (!payload.canal || detail.canal === payload.canal) &&
      (!payload.zona || detail.zona === payload.zona) &&
      (!payload.segmento || detail.segmento === payload.segmento) &&
      (!payload.periodo || detail.periodo === payload.periodo) &&
      (!periods.size || periods.has(detail.periodo))
    );
  }

  private resolveClientSegment(client: Client): DemandSegment {
    const source = this.normalizeText(`${client.nombre} ${client.nombreComercial ?? ''}`);

    if (source.includes('super') || source.includes('mercad')) {
      return 'Supermercado';
    }

    if (source.includes('distrib')) {
      return 'Distribuidor';
    }

    if (source.includes('hospital') || source.includes('clinica') || source.includes('fundacion')) {
      return 'Institucional';
    }

    if (source.includes('tienda') || source.includes('barrio') || source.includes('faro')) {
      return 'Tienda de barrio';
    }

    return 'Cliente clave';
  }

  private resolveChannel(zone: string, product: Product): string {
    if (zone.includes('sur')) {
      return product.familia === 'Producto terminado' ? 'Tradicional / TAT' : 'Mayorista / Distribuidor';
    }

    return product.familia === 'Producto terminado' ? 'Cadenas / Autoservicios' : 'Institucional';
  }

  private mapOptions(values: Iterable<string>): DemandForecastCatalogOption[] {
    return Array.from(new Set(Array.from(values).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'es-CO'))
      .map((value) => ({ value, label: value }));
  }

  private resolveCompanyName(companyId: string): string {
    return companyId === 'medussa-retail' ? EL_ARBOLITO_NAME : 'Empresa activa';
  }

  private hashValue(value: string): number {
    return value.split('').reduce((hash, character) => hash + character.charCodeAt(0), 0);
  }

  private getZoneByIndex(index: number, values: string[]): string {
    return values[index % values.length] ?? values[0];
  }

  private getWeekNumber(date: Date): number {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private toIsoDate(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
