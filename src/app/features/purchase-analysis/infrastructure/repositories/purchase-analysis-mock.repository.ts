import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Supplier } from '../../../suppliers/domain/models/supplier.model';
import { SupplierStore } from '../../../suppliers/domain/models/supplier-response.model';
import { INITIAL_SUPPLIERS_STORE } from '../../../suppliers/infrastructure/data/suppliers.mock';
import {
  DEFAULT_PURCHASE_ANALYSIS_FILTERS,
  PurchaseAnalysisFilters,
} from '../../domain/models/purchase-analysis-filters.model';
import { PurchaseAnalysisAlert, PurchaseAnalysisAlertSeverity } from '../../domain/models/purchase-analysis-alert.model';
import { PurchaseAnalysisDetail } from '../../domain/models/purchase-analysis-detail.model';
import { PurchaseAnalysisKpis } from '../../domain/models/purchase-analysis-kpi.model';
import {
  PurchaseAnalysis,
  PurchaseAnalysisAggregate,
  PurchaseAnalysisCatalogs,
  PurchaseAnalysisCharts,
  PurchaseAnalysisConcentrationPoint,
  PurchaseAnalysisRankingPoint,
  PurchaseAnalysisTrendPoint,
} from '../../domain/models/purchase-analysis.model';
import {
  EMPTY_PURCHASE_ANALYSIS_DASHBOARD,
  PurchaseAnalysisAuditDraft,
  PurchaseAnalysisDashboard,
  PurchaseAnalysisMutationResult,
  PurchaseAnalysisStore,
} from '../../domain/models/purchase-analysis-response.model';
import { PurchaseAnalysisRepository } from '../../domain/repositories/purchase-analysis.repository';

const STORAGE_KEY = 'medussa.erp.mock.purchase-analysis';
const SUPPLIERS_STORAGE_KEY = 'medussa.erp.mock.suppliers';
const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  'medussa-holding': 'Medussa Holding',
  'medussa-retail': 'Industrias Alimenticias El Arbolito',
};
const CATEGORIES = ['Materias primas', 'Insumos', 'Repuestos', 'Etiquetas', 'Empaques', 'Embalajes'];

@Injectable({
  providedIn: 'root',
})
export class PurchaseAnalysisMockRepository implements PurchaseAnalysisRepository {
  getDashboard(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureBaseline(this.readStore(), companyId, normalizedFilters);
    const catalogs = this.buildCatalogs(companyId);
    const analyses = store.analyses
      .filter((item) => item.analysis.empresaId === companyId)
      .filter((item) => this.matchesFilters(item, normalizedFilters))
      .sort((left, right) => new Date(right.analysis.creadoEn).getTime() - new Date(left.analysis.creadoEn).getTime());
    const selectedAnalysis = analyses[0] ?? null;

    return of({
      filters: normalizedFilters,
      catalogs,
      analyses: analyses.map((item) => this.cloneAggregate(item, normalizedFilters.severidad)),
      selectedAnalysis: selectedAnalysis ? this.cloneAggregate(selectedAnalysis, normalizedFilters.severidad) : null,
      kpis: this.buildKpis(selectedAnalysis),
      charts: this.buildCharts(selectedAnalysis),
    }).pipe(delay(180));
  }

  refreshAnalysis(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisMutationResult> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.readStore();
    const aggregate = this.buildAnalysisAggregate(companyId, normalizedFilters);
    const auditDraft = this.buildAuditDraft(
      'refresh',
      aggregate,
      `Analisis estrategico de compras regenerado para ${aggregate.analysis.empresaNombre}.`,
      null,
      this.sanitizeAggregate(aggregate),
    );
    const nextStore = {
      ...store,
      analyses: [aggregate, ...store.analyses.filter((item) => item.analysis.id !== aggregate.analysis.id)],
      auditTrail: [auditDraft, ...store.auditTrail],
    };
    this.writeStore(nextStore);

    return of<PurchaseAnalysisMutationResult>({
      action: 'analyzed',
      analysis: this.cloneAggregate(aggregate, 'TODAS'),
      message: 'Analisis estrategico de compras actualizado.',
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): PurchaseAnalysisStore {
    if (typeof window === 'undefined') return { analyses: [], auditTrail: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { analyses: [], auditTrail: [] };
      this.writeStore(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw) as PurchaseAnalysisStore;
      return { analyses: parsed.analyses ?? [], auditTrail: parsed.auditTrail ?? [] };
    } catch {
      const fallback = { analyses: [], auditTrail: [] };
      this.writeStore(fallback);
      return fallback;
    }
  }

  private writeStore(store: PurchaseAnalysisStore): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private readSuppliers(companyId: string): Supplier[] {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers).filter((item) => item.empresaId === companyId);
    }
    const raw = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (!raw) {
      return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers).filter((item) => item.empresaId === companyId);
    }
    try {
      return ((JSON.parse(raw) as SupplierStore).suppliers ?? []).filter((item) => item.empresaId === companyId);
    } catch {
      return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers).filter((item) => item.empresaId === companyId);
    }
  }

  private ensureBaseline(
    store: PurchaseAnalysisStore,
    companyId: string,
    filters: PurchaseAnalysisFilters,
  ): PurchaseAnalysisStore {
    const analysisId = this.buildAnalysisId(companyId, filters);
    const exists = store.analyses.some((item) => item.analysis.id === analysisId);
    if (exists) return store;

    const aggregate = this.buildAnalysisAggregate(companyId, filters);
    const auditDraft = this.buildAuditDraft(
      'analyze',
      aggregate,
      `Seed inicial de analisis de compras para ${aggregate.analysis.empresaNombre}.`,
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

  private buildCatalogs(companyId: string): PurchaseAnalysisCatalogs {
    const suppliers = this.readSuppliers(companyId).filter((item) => item.estado === 'ACTIVO');
    const cities = new Set(suppliers.map((item) => item.ciudadNombre ?? '').filter(Boolean));
    const supplyTypes = new Set(suppliers.map((item) => item.tipoAbastecimiento));

    return {
      providers: suppliers.map((item) => ({ value: item.id, label: item.nombreProveedor })),
      categories: CATEGORIES.map((item) => ({ value: item, label: item })),
      supplyTypes: Array.from(supplyTypes).map((item) => ({ value: item, label: item })),
      cities: Array.from(cities).sort((a, b) => a.localeCompare(b, 'es-CO')).map((item) => ({ value: item, label: item })),
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private buildAnalysisAggregate(companyId: string, filters: PurchaseAnalysisFilters): PurchaseAnalysisAggregate {
    const suppliers = this.readSuppliers(companyId).filter((item) => item.estado === 'ACTIVO');
    const rawDetails = suppliers.flatMap((supplier) => this.buildSupplierHistory(supplier, filters));
    const categoryTotals = new Map<string, number>();

    rawDetails.forEach((detail) => {
      categoryTotals.set(detail.categoria, (categoryTotals.get(detail.categoria) ?? 0) + detail.valorTotal);
    });

    const details = rawDetails.map((detail) => ({
      ...detail,
      participacionCategoriaPct: categoryTotals.get(detail.categoria)
        ? Math.round((detail.valorTotal / (categoryTotals.get(detail.categoria) ?? 1)) * 100)
        : 0,
    }));
    const analysis: PurchaseAnalysis = {
      id: this.buildAnalysisId(companyId, filters),
      empresaId: companyId,
      empresaNombre: COMPANY_DISPLAY_NAMES[companyId] ?? 'Empresa activa',
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      categoria: filters.categoria,
      tipoAbastecimiento: filters.tipoAbastecimiento,
      proveedorId: filters.proveedorId,
      proveedorNombre: details.find((item) => item.proveedorId === filters.proveedorId)?.proveedorNombre ?? null,
      creadoEn: new Date().toISOString(),
      resumenKpis: this.emptyKpis(),
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

  private buildSupplierHistory(supplier: Supplier, filters: PurchaseAnalysisFilters): PurchaseAnalysisDetail[] {
    const months = this.buildMonths(filters.fechaDesde, filters.fechaHasta);
    const category = this.resolveCategory(supplier);
    const qualityBase = this.resolveQualityScore(supplier);
    const complianceBase = this.resolveComplianceScore(supplier);

    return months.map((month, index) => {
      const spendFactor = 0.86 + ((this.hashValue(`${supplier.id}-${month}`) % 32) / 100);
      const basePrice = this.resolveBaseUnitPrice(category, supplier.tipoAbastecimiento);
      const priceTrend = 1 + ((index - Math.max(months.length - 1, 1) / 2) * 0.02);
      const priceNoise = 1 + ((this.hashValue(`${supplier.id}-price-${month}`) % 11) - 5) / 100;
      const priceUnit = Math.max(80, Math.round(basePrice * priceTrend * priceNoise));
      const quantity = Math.max(10, Math.round((supplier.moq ?? 60) * spendFactor));
      const total = priceUnit * quantity;
      const previousPrice = index > 0
        ? Math.max(80, Math.round(basePrice * (1 + (((index - 1) - Math.max(months.length - 1, 1) / 2) * 0.02)) * (1 + ((this.hashValue(`${supplier.id}-price-${months[index - 1]}`) % 11) - 5) / 100)))
        : priceUnit;
      const variationPct = previousPrice ? Math.round(((priceUnit - previousPrice) / previousPrice) * 100) : 0;
      const leadTime = Math.max(1, (supplier.leadTimeDias ?? 4) + ((this.hashValue(`${supplier.id}-${month}-lead`) % 3) - 1));
      const qualityScore = Math.max(58, Math.min(97, qualityBase + ((this.hashValue(`${supplier.id}-${month}-quality`) % 7) - 3)));
      const complianceScore = Math.max(52, Math.min(98, complianceBase + ((this.hashValue(`${supplier.id}-${month}-comp`) % 9) - 4)));
      const savings = variationPct > 6 ? Math.round(total * 0.08) : qualityScore >= 90 && complianceScore >= 90 ? Math.round(total * 0.03) : Math.round(total * 0.015);

      const detail: PurchaseAnalysisDetail = {
        id: `purchase-${supplier.id}-${month}`,
        analisisId: this.buildAnalysisId(supplier.empresaId, filters),
        proveedorId: supplier.id,
        proveedorNombre: supplier.nombreProveedor,
        categoria: category,
        tipoAbastecimiento: supplier.tipoAbastecimiento,
        ciudad: supplier.ciudadNombre ?? 'Sin ciudad',
        fechaCompra: `${month}-15`,
        valorTotal: total,
        precioUnitario: priceUnit,
        leadTimeDias: leadTime,
        calidadScore: qualityScore,
        cumplimientoScore: complianceScore,
        participacionCategoriaPct: 0,
        variacionPrecioPct: variationPct,
        oportunidadAhorro: savings,
        riesgoPrincipal: this.resolveRisk(variationPct, qualityScore, complianceScore, 0),
      };

      return detail;
    }).filter((detail) => this.matchesDetailFilters(detail, filters));
  }

  private buildAlerts(analysisId: string, details: PurchaseAnalysisDetail[]): PurchaseAnalysisAlert[] {
    const byCategory = new Map<string, PurchaseAnalysisDetail[]>();
    details.forEach((detail) => {
      byCategory.set(detail.categoria, [...(byCategory.get(detail.categoria) ?? []), detail]);
    });

    const alerts: PurchaseAnalysisAlert[] = [];

    details.forEach((detail) => {
      if (detail.variacionPrecioPct >= 10) {
        alerts.push({
          id: `alert-price-${detail.id}`,
          analisisId: analysisId,
          proveedorId: detail.proveedorId,
          categoria: detail.categoria,
          tipo: 'ALZA_PRECIO',
          severidad: detail.variacionPrecioPct >= 16 ? 'ALTA' : 'MEDIA',
          descripcion: `Alza de precio de ${detail.variacionPrecioPct}% en ${detail.proveedorNombre}.`,
        });
      }

      if (detail.cumplimientoScore <= 74) {
        alerts.push({
          id: `alert-compliance-${detail.id}`,
          analisisId: analysisId,
          proveedorId: detail.proveedorId,
          categoria: detail.categoria,
          tipo: 'INCUMPLIMIENTO_RECURRENTE',
          severidad: detail.cumplimientoScore <= 66 ? 'ALTA' : 'MEDIA',
          descripcion: `Cumplimiento bajo (${detail.cumplimientoScore}) en ${detail.proveedorNombre}.`,
        });
      }

      if (detail.calidadScore <= 72) {
        alerts.push({
          id: `alert-quality-${detail.id}`,
          analisisId: analysisId,
          proveedorId: detail.proveedorId,
          categoria: detail.categoria,
          tipo: 'CALIDAD_BAJA',
          severidad: detail.calidadScore <= 64 ? 'ALTA' : 'BAJA',
          descripcion: `Calidad baja (${detail.calidadScore}) en ${detail.proveedorNombre}.`,
        });
      }
    });

    byCategory.forEach((items, category) => {
      const total = items.reduce((sum, item) => sum + item.valorTotal, 0);
      const providerSpend = new Map<string, { supplierName: string; spend: number }>();
      items.forEach((item) => {
        const current = providerSpend.get(item.proveedorId) ?? { supplierName: item.proveedorNombre, spend: 0 };
        current.spend += item.valorTotal;
        providerSpend.set(item.proveedorId, current);
      });
      const ranked = Array.from(providerSpend.entries())
        .map(([providerId, values]) => ({ providerId, ...values, share: total ? Math.round((values.spend / total) * 100) : 0 }))
        .sort((left, right) => right.share - left.share);
      const first = ranked[0];

      if (ranked.length === 1 && first) {
        alerts.push({
          id: `alert-single-${category}`,
          analisisId: analysisId,
          proveedorId: first.providerId,
          categoria: category,
          tipo: 'PROVEEDOR_UNICO',
          severidad: 'ALTA',
          descripcion: `Categoria ${category} depende de un unico proveedor: ${first.supplierName}.`,
        });
      }

      if (first && first.share >= 70) {
        alerts.push({
          id: `alert-dependency-${category}`,
          analisisId: analysisId,
          proveedorId: first.providerId,
          categoria: category,
          tipo: 'DEPENDENCIA_ALTA',
          severidad: 'ALTA',
          descripcion: `${first.supplierName} concentra ${first.share}% del gasto en ${category}.`,
        });
      }
    });

    return alerts.slice(0, 40);
  }

  private buildKpis(aggregate: PurchaseAnalysisAggregate | null): PurchaseAnalysisKpis {
    return aggregate?.analysis.resumenKpis ?? this.emptyKpis();
  }

  private buildCharts(aggregate: PurchaseAnalysisAggregate | null): PurchaseAnalysisCharts {
    if (!aggregate) {
      return {
        topSpend: [],
        topQuality: [],
        topCompliance: [],
        priceTrend: [],
        concentration: [],
        savingsByCategory: [],
      };
    }

    return {
      topSpend: this.buildProviderRanking(aggregate.details, 'valorTotal'),
      topQuality: this.buildProviderRanking(aggregate.details, 'calidadScore'),
      topCompliance: this.buildProviderRanking(aggregate.details, 'cumplimientoScore'),
      priceTrend: this.buildPriceTrend(aggregate.details),
      concentration: this.buildConcentration(aggregate.details),
      savingsByCategory: this.buildSavingsRanking(aggregate.details),
    };
  }

  private buildProviderRanking(
    details: PurchaseAnalysisDetail[],
    metric: 'valorTotal' | 'calidadScore' | 'cumplimientoScore',
  ): PurchaseAnalysisRankingPoint[] {
    const map = new Map<string, { label: string; total: number; count: number }>();
    details.forEach((detail) => {
      const current = map.get(detail.proveedorId) ?? { label: detail.proveedorNombre, total: 0, count: 0 };
      current.total += detail[metric];
      current.count += 1;
      map.set(detail.proveedorId, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        label: item.label,
        value: metric === 'valorTotal' ? Math.round(item.total) : Math.round(item.total / Math.max(item.count, 1)),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  private buildPriceTrend(details: PurchaseAnalysisDetail[]): PurchaseAnalysisTrendPoint[] {
    const map = new Map<string, { total: number; count: number }>();
    details.forEach((detail) => {
      const month = detail.fechaCompra.slice(0, 7);
      const current = map.get(month) ?? { total: 0, count: 0 };
      current.total += detail.precioUnitario;
      current.count += 1;
      map.set(month, current);
    });

    return Array.from(map.entries())
      .map(([label, values]) => ({ label, value: Math.round(values.total / Math.max(values.count, 1)) }))
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, 12);
  }

  private buildConcentration(details: PurchaseAnalysisDetail[]): PurchaseAnalysisConcentrationPoint[] {
    const categoryTotals = new Map<string, number>();
    const topByCategory = new Map<string, { supplier: string; spend: number }>();
    details.forEach((detail) => {
      categoryTotals.set(detail.categoria, (categoryTotals.get(detail.categoria) ?? 0) + detail.valorTotal);
      const current = topByCategory.get(detail.categoria);
      if (!current || detail.valorTotal > current.spend) {
        topByCategory.set(detail.categoria, { supplier: detail.proveedorNombre, spend: detail.valorTotal });
      }
    });

    return Array.from(topByCategory.entries())
      .map(([label, entry]) => ({
        label: `${label} · ${entry.supplier}`,
        sharePct: categoryTotals.get(label) ? Math.round((entry.spend / (categoryTotals.get(label) ?? 1)) * 100) : 0,
        spend: entry.spend,
      }))
      .sort((left, right) => right.sharePct - left.sharePct)
      .slice(0, 6);
  }

  private buildSavingsRanking(details: PurchaseAnalysisDetail[]): PurchaseAnalysisRankingPoint[] {
    const map = new Map<string, number>();
    details.forEach((detail) => {
      map.set(detail.categoria, (map.get(detail.categoria) ?? 0) + detail.oportunidadAhorro);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  private computeKpis(details: PurchaseAnalysisDetail[], alerts: PurchaseAnalysisAlert[]): PurchaseAnalysisKpis {
    const totalSpend = details.reduce((sum, detail) => sum + detail.valorTotal, 0);
    const mirSpend = details.filter((detail) => detail.tipoAbastecimiento === 'MIR').reduce((sum, detail) => sum + detail.valorTotal, 0);
    const logisticsSpend = details.filter((detail) => detail.tipoAbastecimiento === 'LOGISTICA').reduce((sum, detail) => sum + detail.valorTotal, 0);
    const criticalSuppliers = new Set(
      details.filter((detail) => ['ALZA_PRECIO', 'INCUMPLIMIENTO_RECURRENTE', 'CALIDAD_BAJA'].includes(detail.riesgoPrincipal ?? '')).map((detail) => detail.proveedorId),
    ).size;
    const highRiskActive = alerts.filter((alert) => alert.severidad === 'ALTA').length;
    const estimatedSavings = details.reduce((sum, detail) => sum + detail.oportunidadAhorro, 0);

    return {
      totalSpend,
      mirSpend,
      logisticsSpend,
      criticalSuppliers,
      highRiskActive,
      estimatedSavings,
    };
  }

  private cloneAggregate(
    aggregate: PurchaseAnalysisAggregate,
    severity: PurchaseAnalysisAlertSeverity | 'TODAS',
  ): PurchaseAnalysisAggregate {
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

  private matchesFilters(aggregate: PurchaseAnalysisAggregate, filters: PurchaseAnalysisFilters): boolean {
    return aggregate.details.some((detail) => this.matchesDetailFilters(detail, filters));
  }

  private matchesDetailFilters(detail: PurchaseAnalysisDetail, filters: PurchaseAnalysisFilters): boolean {
    return (
      (!filters.proveedorId || detail.proveedorId === filters.proveedorId) &&
      (!filters.categoria || detail.categoria === filters.categoria) &&
      (!filters.tipoAbastecimiento || detail.tipoAbastecimiento === filters.tipoAbastecimiento) &&
      (!filters.ciudad || detail.ciudad === filters.ciudad) &&
      detail.fechaCompra >= filters.fechaDesde &&
      detail.fechaCompra <= filters.fechaHasta
    );
  }

  private normalizeFilters(filters: PurchaseAnalysisFilters): PurchaseAnalysisFilters {
    return {
      ...DEFAULT_PURCHASE_ANALYSIS_FILTERS,
      ...filters,
      proveedorId: filters.proveedorId ?? null,
      categoria: filters.categoria ?? null,
      tipoAbastecimiento: filters.tipoAbastecimiento ?? null,
      ciudad: filters.ciudad ?? null,
      severidad: filters.severidad ?? 'TODAS',
    };
  }

  private resolveCategory(supplier: Supplier): string {
    const product = this.normalizeText(supplier.productoPrincipal);
    if (product.includes('repuesto')) return 'Repuestos';
    if (product.includes('etiquet')) return 'Etiquetas';
    if (product.includes('empaque')) return 'Empaques';
    if (product.includes('embal')) return 'Embalajes';
    if (product.includes('quim') || product.includes('solido')) return 'Insumos';
    return 'Materias primas';
  }

  private resolveBaseUnitPrice(category: string, supplyType: string): number {
    const base =
      category === 'Materias primas' ? 9200 :
      category === 'Insumos' ? 6400 :
      category === 'Repuestos' ? 28400 :
      category === 'Etiquetas' ? 210 :
      category === 'Empaques' ? 320 :
      540;

    return supplyType === 'LOGISTICA' ? Math.round(base * 1.08) : base;
  }

  private resolveQualityScore(supplier: Supplier): number {
    const seed = this.hashValue(`${supplier.id}-quality`) % 15;
    return Math.max(62, 90 - seed);
  }

  private resolveComplianceScore(supplier: Supplier): number {
    const seed = this.hashValue(`${supplier.id}-comp`) % 18;
    return Math.max(58, 92 - seed);
  }

  private resolveRisk(
    variationPct: number,
    qualityScore: number,
    complianceScore: number,
    sharePct: number,
  ): string | null {
    if (sharePct >= 70) return 'DEPENDENCIA_ALTA';
    if (variationPct >= 10) return 'ALZA_PRECIO';
    if (complianceScore <= 74) return 'INCUMPLIMIENTO_RECURRENTE';
    if (qualityScore <= 72) return 'CALIDAD_BAJA';
    return null;
  }

  private buildMonths(from: string, to: string): string[] {
    const result: string[] = [];
    const cursor = new Date(`${from}T00:00:00`);
    const limit = new Date(`${to}T00:00:00`);
    cursor.setDate(1);
    limit.setDate(1);

    while (cursor <= limit && result.length < 12) {
      result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result.length ? result : [new Date().toISOString().slice(0, 7)];
  }

  private buildAnalysisId(companyId: string, filters: PurchaseAnalysisFilters): string {
    return `purchase-analysis-${companyId}-${filters.fechaDesde}-${filters.fechaHasta}-${filters.categoria ?? 'all'}-${filters.tipoAbastecimiento ?? 'all'}`;
  }

  private buildAuditDraft(
    action: PurchaseAnalysisAuditDraft['action'],
    aggregate: PurchaseAnalysisAggregate,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): PurchaseAnalysisAuditDraft {
    return {
      module: 'analisis-compras',
      action,
      companyId: aggregate.analysis.empresaId,
      companyName: aggregate.analysis.empresaNombre,
      entityId: aggregate.analysis.id,
      entityName: 'Analisis estrategico de compras',
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAggregate(aggregate: PurchaseAnalysisAggregate): Record<string, unknown> {
    return {
      analysis: {
        id: aggregate.analysis.id,
        resumenKpis: { ...aggregate.analysis.resumenKpis },
      },
      details: aggregate.details.slice(0, 10).map((detail) => ({
        proveedorNombre: detail.proveedorNombre,
        categoria: detail.categoria,
        valorTotal: detail.valorTotal,
        precioUnitario: detail.precioUnitario,
        leadTimeDias: detail.leadTimeDias,
      })),
      alerts: aggregate.alerts.slice(0, 8).map((alert) => ({ ...alert })),
    };
  }

  private emptyKpis(): PurchaseAnalysisKpis {
    return {
      totalSpend: 0,
      mirSpend: 0,
      logisticsSpend: 0,
      criticalSuppliers: 0,
      highRiskActive: 0,
      estimatedSavings: 0,
    };
  }

  private hashValue(value: string): number {
    return value.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
