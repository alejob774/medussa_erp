import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { PurchaseAnalysisAggregate } from '../../../purchase-analysis/domain/models/purchase-analysis.model';
import { PurchaseAnalysisStore } from '../../../purchase-analysis/domain/models/purchase-analysis-response.model';
import { Supplier } from '../../../suppliers/domain/models/supplier.model';
import { SupplierStore } from '../../../suppliers/domain/models/supplier-response.model';
import { INITIAL_SUPPLIERS_STORE } from '../../../suppliers/infrastructure/data/suppliers.mock';
import { BudgetManagementAlert, BudgetManagementAlertSeverity } from '../../domain/models/budget-management-alert.model';
import { BudgetManagementExecution } from '../../domain/models/budget-management-execution.model';
import {
  DEFAULT_BUDGET_MANAGEMENT_FILTERS,
  BudgetManagementFilters,
} from '../../domain/models/budget-management-filters.model';
import { BudgetManagementHistory, BudgetManagementMovementType } from '../../domain/models/budget-management-history.model';
import { BudgetManagementKpis } from '../../domain/models/budget-management-kpi.model';
import {
  BUDGET_COST_CENTER_OPTIONS,
  BUDGET_MANAGEMENT_CATEGORIES,
  BudgetManagement,
  BudgetManagementAggregate,
  BudgetManagementCategory,
  BudgetManagementCatalogs,
  BudgetManagementCharts,
  BudgetManagementStatus,
  BudgetSupplyType,
} from '../../domain/models/budget-management.model';
import {
  BudgetManagementAuditDraft,
  BudgetManagementDashboard,
  BudgetManagementMutationResult,
  BudgetManagementStore,
} from '../../domain/models/budget-management-response.model';
import {
  AdjustBudgetManagementPayload,
  BudgetManagementRepository,
  SaveBudgetManagementPayload,
} from '../../domain/repositories/budget-management.repository';
import { CostCenterCode } from '../../domain/models/cost-center.model';

const STORAGE_KEY = 'medussa.erp.mock.budget-management';
const PURCHASE_ANALYSIS_STORAGE_KEY = 'medussa.erp.mock.purchase-analysis';
const SUPPLIERS_STORAGE_KEY = 'medussa.erp.mock.suppliers';

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

type SeedProfile = 'CONTROLADO' | 'AJUSTADO' | 'EN_RIESGO' | 'SOBREGASTO';

interface CategoryConfig {
  type: BudgetSupplyType;
  fallback: number;
  costCenters: Array<{ center: CostCenterCode; share: number }>;
}

interface ProfileConfig {
  projectionRate: number;
  projectionBias: number;
  adjustmentRate: number;
  reserveRate: number;
  releaseRate: number;
}

interface SpendSeed {
  monthKey: string;
  category: BudgetManagementCategory;
  type: BudgetSupplyType;
  amount: number;
}

const CATEGORY_CONFIG: Record<BudgetManagementCategory, CategoryConfig> = {
  'Materias primas': {
    type: 'MIR',
    fallback: 92000000,
    costCenters: [
      { center: 'PRODUCCION', share: 0.7 },
      { center: 'COMPRAS', share: 0.12 },
      { center: 'CALIDAD', share: 0.18 },
    ],
  },
  Insumos: {
    type: 'MIR',
    fallback: 36000000,
    costCenters: [
      { center: 'PRODUCCION', share: 0.45 },
      { center: 'CALIDAD', share: 0.25 },
      { center: 'BODEGA', share: 0.15 },
      { center: 'COMPRAS', share: 0.15 },
    ],
  },
  Repuestos: {
    type: 'MIR',
    fallback: 22000000,
    costCenters: [
      { center: 'MANTENIMIENTO', share: 0.78 },
      { center: 'PRODUCCION', share: 0.22 },
    ],
  },
  Etiquetas: {
    type: 'LOGISTICA',
    fallback: 18500000,
    costCenters: [
      { center: 'LOGISTICA', share: 0.4 },
      { center: 'CALIDAD', share: 0.35 },
      { center: 'COMPRAS', share: 0.25 },
    ],
  },
  Empaques: {
    type: 'LOGISTICA',
    fallback: 42000000,
    costCenters: [
      { center: 'LOGISTICA', share: 0.55 },
      { center: 'BODEGA', share: 0.3 },
      { center: 'PRODUCCION', share: 0.15 },
    ],
  },
  Embalajes: {
    type: 'LOGISTICA',
    fallback: 17000000,
    costCenters: [
      { center: 'LOGISTICA', share: 0.6 },
      { center: 'BODEGA', share: 0.4 },
    ],
  },
};

const PROFILE_CONFIG: Record<SeedProfile, ProfileConfig> = {
  CONTROLADO: {
    projectionRate: 0.86,
    projectionBias: 1.02,
    adjustmentRate: 0,
    reserveRate: 0.12,
    releaseRate: 0.04,
  },
  AJUSTADO: {
    projectionRate: 0.93,
    projectionBias: 1.03,
    adjustmentRate: 0.08,
    reserveRate: 0.15,
    releaseRate: 0.05,
  },
  EN_RIESGO: {
    projectionRate: 1.02,
    projectionBias: 1.06,
    adjustmentRate: 0.03,
    reserveRate: 0.18,
    releaseRate: 0.02,
  },
  SOBREGASTO: {
    projectionRate: 1.14,
    projectionBias: 1.1,
    adjustmentRate: 0.04,
    reserveRate: 0.2,
    releaseRate: 0.01,
  },
};

@Injectable({
  providedIn: 'root',
})
export class BudgetManagementMockRepository implements BudgetManagementRepository {
  getDashboard(companyId: string, filters: BudgetManagementFilters): Observable<BudgetManagementDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const seededStore = this.ensureBaseline(this.readStore(), companyId);
    const refreshedStore = this.recalculateCompanyBudgets(seededStore, companyId);
    const filteredBudgets = refreshedStore.budgets
      .filter((aggregate) => aggregate.budget.empresaId === companyId)
      .filter((aggregate) => this.matchesFilters(aggregate, normalizedFilters))
      .sort((left, right) => this.sortBudgets(left, right))
      .map((aggregate) => this.cloneAggregate(aggregate, normalizedFilters.severidad));

    const selectedBudget = filteredBudgets[0] ?? null;

    return of({
      filters: normalizedFilters,
      catalogs: this.buildCatalogs(refreshedStore, companyId),
      budgets: filteredBudgets,
      selectedBudget,
      kpis: this.buildKpis(filteredBudgets),
      charts: this.buildCharts(filteredBudgets),
      alerts: this.buildDashboardAlerts(filteredBudgets, normalizedFilters.severidad),
    }).pipe(delay(180));
  }

  saveBudget(
    companyId: string,
    payload: SaveBudgetManagementPayload,
    budgetId?: string,
  ): Observable<BudgetManagementMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const existing = budgetId
      ? store.budgets.find(
          (aggregate) =>
            aggregate.budget.id === budgetId && aggregate.budget.empresaId === companyId,
        ) ?? null
      : null;

    const duplicate = store.budgets.find(
      (aggregate) =>
        aggregate.budget.empresaId === companyId &&
        aggregate.budget.anio === payload.anio &&
        aggregate.budget.mes === payload.mes &&
        aggregate.budget.centroCosto === payload.centroCosto &&
        aggregate.budget.categoria === payload.categoria &&
        aggregate.budget.tipoAbastecimiento === payload.tipoAbastecimiento &&
        aggregate.budget.id !== budgetId,
    );

    if (duplicate) {
      return throwError(
        () =>
          new Error(
            'Ya existe un presupuesto para ese periodo, centro de costo, categoria y tipo de abastecimiento.',
          ),
      );
    }

    const now = new Date().toISOString();
    const companyName = this.resolveCompanyName(companyId);
    const nextBudget: BudgetManagement = existing
      ? {
          ...existing.budget,
          anio: payload.anio,
          mes: payload.mes,
          centroCosto: payload.centroCosto,
          categoria: payload.categoria,
          tipoAbastecimiento: payload.tipoAbastecimiento,
          moneda: payload.moneda || 'COP',
          valorAprobado: this.roundCurrency(payload.valorAprobado),
          valorAjustado: this.roundCurrency(payload.valorAjustado),
          actualizadoEn: now,
        }
      : {
          id: `budget-${companyId}-${Date.now()}-${this.slugify(payload.centroCosto)}-${this.slugify(
            payload.categoria,
          )}`,
          empresaId: companyId,
          empresaNombre: companyName,
          anio: payload.anio,
          mes: payload.mes,
          centroCosto: payload.centroCosto,
          categoria: payload.categoria,
          tipoAbastecimiento: payload.tipoAbastecimiento,
          moneda: payload.moneda || 'COP',
          valorAprobado: this.roundCurrency(payload.valorAprobado),
          valorAjustado: this.roundCurrency(payload.valorAjustado),
          estado: 'CONTROLADO',
          creadoEn: now,
          actualizadoEn: now,
        };

    const previousAggregate = existing ? this.cloneAggregate(existing, 'TODAS') : null;
    const history = existing
      ? existing.history.map((item) => ({ ...item }))
      : [];
    const previousPlan = existing
      ? existing.budget.valorAprobado + existing.budget.valorAjustado
      : 0;
    const nextPlan = nextBudget.valorAprobado + nextBudget.valorAjustado;
    const planDelta = this.roundCurrency(nextPlan - previousPlan);

    if (existing && planDelta !== 0) {
      history.push(
        this.buildMovement(
          existing.budget.id,
          'AJUSTE',
          payload.referencia || 'Edicion presupuestal',
          planDelta,
          now,
          payload.usuario,
        ),
      );
    }

    if (!existing && nextBudget.valorAjustado !== 0) {
      history.push(
        this.buildMovement(
          nextBudget.id,
          'AJUSTE',
          payload.referencia || 'Ajuste inicial',
          nextBudget.valorAjustado,
          now,
          payload.usuario,
        ),
      );
    }

    const recalculated = this.recalculateAggregate({
      budget: nextBudget,
      execution: this.emptyExecution(nextBudget.id),
      alerts: [],
      history,
    });

    const auditDraft = this.buildAuditDraft(
      existing ? 'edit' : 'create',
      recalculated,
      existing
        ? `Presupuesto ${this.formatMonthLabel(recalculated.budget.mes)} ${recalculated.budget.anio} actualizado para ${this.formatCostCenterLabel(recalculated.budget.centroCosto)}.`
        : `Presupuesto ${this.formatMonthLabel(recalculated.budget.mes)} ${recalculated.budget.anio} creado para ${this.formatCostCenterLabel(recalculated.budget.centroCosto)}.`,
      previousAggregate ? this.sanitizeAggregate(previousAggregate) : null,
      this.sanitizeAggregate(recalculated),
    );

    const nextStore: BudgetManagementStore = {
      ...store,
      budgets: existing
        ? store.budgets.map((aggregate) =>
            aggregate.budget.id === existing.budget.id ? recalculated : aggregate,
          )
        : [recalculated, ...store.budgets],
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);

    return of<BudgetManagementMutationResult>({
      action: existing ? 'updated' : 'created',
      budget: this.cloneAggregate(recalculated, 'TODAS'),
      message: existing
        ? 'Presupuesto actualizado y recalculado correctamente.'
        : 'Presupuesto creado correctamente en localStorage.',
      auditDraft,
    }).pipe(delay(220));
  }

  adjustBudget(
    companyId: string,
    budgetId: string,
    payload: AdjustBudgetManagementPayload,
  ): Observable<BudgetManagementMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const existing =
      store.budgets.find(
        (aggregate) =>
          aggregate.budget.id === budgetId && aggregate.budget.empresaId === companyId,
      ) ?? null;

    if (!existing) {
      return throwError(() => new Error('No se encontro el presupuesto solicitado.'));
    }

    const previousAggregate = this.cloneAggregate(existing, 'TODAS');
    const updatedBudget: BudgetManagement = {
      ...existing.budget,
      valorAprobado: this.roundCurrency(payload.valorAprobado),
      valorAjustado: this.roundCurrency(payload.valorAjustado),
      actualizadoEn: new Date().toISOString(),
    };
    const previousPlan = existing.budget.valorAprobado + existing.budget.valorAjustado;
    const nextPlan = updatedBudget.valorAprobado + updatedBudget.valorAjustado;
    const delta = this.roundCurrency(nextPlan - previousPlan);
    const history = existing.history.map((item) => ({ ...item }));

    if (delta !== 0) {
      history.push(
        this.buildMovement(
          existing.budget.id,
          'AJUSTE',
          payload.referencia,
          delta,
          updatedBudget.actualizadoEn,
          payload.usuario,
        ),
      );
    }

    const recalculated = this.recalculateAggregate({
      budget: updatedBudget,
      execution: this.emptyExecution(updatedBudget.id),
      alerts: [],
      history,
    });

    const auditDraft = this.buildAuditDraft(
      'adjust',
      recalculated,
      `Ajuste presupuestal aplicado en ${this.formatCostCenterLabel(recalculated.budget.centroCosto)} para ${recalculated.budget.categoria}.`,
      this.sanitizeAggregate(previousAggregate),
      this.sanitizeAggregate(recalculated),
    );

    const nextStore: BudgetManagementStore = {
      ...store,
      budgets: store.budgets.map((aggregate) =>
        aggregate.budget.id === budgetId ? recalculated : aggregate,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);

    return of<BudgetManagementMutationResult>({
      action: 'adjusted',
      budget: this.cloneAggregate(recalculated, 'TODAS'),
      message: 'Ajuste presupuestal registrado y recalculado.',
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): BudgetManagementStore {
    if (typeof window === 'undefined') {
      return { budgets: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const initialStore: BudgetManagementStore = { budgets: [], auditTrail: [] };
      this.writeStore(initialStore);
      return initialStore;
    }

    try {
      const parsed = JSON.parse(raw) as BudgetManagementStore;
      return {
        budgets: parsed.budgets ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const fallbackStore: BudgetManagementStore = { budgets: [], auditTrail: [] };
      this.writeStore(fallbackStore);
      return fallbackStore;
    }
  }

  private writeStore(store: BudgetManagementStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(store: BudgetManagementStore, companyId: string): BudgetManagementStore {
    const hasCompanyBudgets = store.budgets.some((aggregate) => aggregate.budget.empresaId === companyId);

    if (hasCompanyBudgets) {
      return store;
    }

    const seededBudgets = this.seedBudgets(companyId);

    if (!seededBudgets.length) {
      return store;
    }

    const auditDraft = this.buildAuditDraft(
      'seed',
      seededBudgets[0],
      `Seed inicial de presupuesto para ${this.resolveCompanyName(companyId)}.`,
      null,
      {
        registros: seededBudgets.length,
        empresaId: companyId,
      },
    );

    const nextStore: BudgetManagementStore = {
      ...store,
      budgets: [...seededBudgets, ...store.budgets],
      auditTrail: [auditDraft, ...store.auditTrail],
    };

    this.writeStore(nextStore);
    return nextStore;
  }

  private recalculateCompanyBudgets(
    store: BudgetManagementStore,
    companyId: string,
  ): BudgetManagementStore {
    const nextStore: BudgetManagementStore = {
      ...store,
      budgets: store.budgets.map((aggregate) =>
        aggregate.budget.empresaId === companyId
          ? this.recalculateAggregate(aggregate)
          : aggregate,
      ),
    };

    this.writeStore(nextStore);
    return nextStore;
  }

  private seedBudgets(companyId: string): BudgetManagementAggregate[] {
    const companyName = this.resolveCompanyName(companyId);
    const monthKeys = this.buildSeedMonths();
    const spendSeeds = this.buildSpendSeeds(companyId, monthKeys);

    return monthKeys.flatMap((monthKey, index) =>
      BUDGET_MANAGEMENT_CATEGORIES.flatMap((category) => {
        const config = CATEGORY_CONFIG[category];
        const monthBaseAmount =
          spendSeeds.get(`${monthKey}|${category}`) ??
          this.roundCurrency(config.fallback * (0.94 + index * 0.05));

        return config.costCenters.map(({ center, share }) => {
          const profile = this.resolveProfile(center, category);
          const projectedFullMonth = this.roundCurrency(monthBaseAmount * share);
          const effectiveBudget = this.roundCurrency(
            projectedFullMonth / PROFILE_CONFIG[profile].projectionRate,
          );
          const adjustmentValue = this.roundCurrency(
            effectiveBudget * PROFILE_CONFIG[profile].adjustmentRate,
          );
          const approvedValue = Math.max(
            500000,
            this.roundCurrency(effectiveBudget - adjustmentValue),
          );
          const [year, month] = monthKey.split('-').map((value) => Number(value));
          const createdAt = this.buildIsoDate(year, month, 2 + index);
          const budget: BudgetManagement = {
            id: `budget-${companyId}-${monthKey}-${this.slugify(center)}-${this.slugify(category)}`,
            empresaId: companyId,
            empresaNombre: companyName,
            anio: year,
            mes: month,
            centroCosto: center,
            categoria: category,
            tipoAbastecimiento: config.type,
            moneda: 'COP',
            valorAprobado: approvedValue,
            valorAjustado: adjustmentValue,
            estado: 'CONTROLADO',
            creadoEn: createdAt,
            actualizadoEn: createdAt,
          };

          return this.recalculateAggregate({
            budget,
            execution: this.emptyExecution(budget.id),
            alerts: [],
            history: this.buildSeedHistory(budget, profile, monthKey),
          });
        });
      }),
    );
  }

  private buildCatalogs(store: BudgetManagementStore, companyId: string): BudgetManagementCatalogs {
    const years = new Set<number>([
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
    ]);

    store.budgets
      .filter((aggregate) => aggregate.budget.empresaId === companyId)
      .forEach((aggregate) => years.add(aggregate.budget.anio));

    return {
      years: Array.from(years)
        .sort((left, right) => left - right)
        .map((value) => ({ value, label: `${value}` })),
      months: MONTH_LABELS.map((label, index) => ({
        value: index + 1,
        label,
      })),
      costCenters: BUDGET_COST_CENTER_OPTIONS,
      categories: BUDGET_MANAGEMENT_CATEGORIES.map((value) => ({ value, label: value })),
      supplyTypes: [
        { value: 'MIR', label: 'MIR' },
        { value: 'LOGISTICA', label: 'LOGISTICA' },
      ],
      statuses: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'CONTROLADO', label: 'Controlado' },
        { value: 'AJUSTADO', label: 'Ajustado' },
        { value: 'EN_RIESGO', label: 'En riesgo' },
        { value: 'SOBREGASTO', label: 'Sobregasto' },
      ],
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private buildKpis(budgets: BudgetManagementAggregate[]): BudgetManagementKpis {
    const totalApproved = budgets.reduce(
      (sum, aggregate) =>
        sum + aggregate.budget.valorAprobado + aggregate.budget.valorAjustado,
      0,
    );
    const totalConsumed = budgets.reduce(
      (sum, aggregate) => sum + aggregate.execution.valorConsumido,
      0,
    );
    const totalAvailable = budgets.reduce(
      (sum, aggregate) => sum + aggregate.execution.saldoDisponible,
      0,
    );
    const riskCategories = new Set(
      budgets
        .filter((aggregate) =>
          ['EN_RIESGO', 'SOBREGASTO'].includes(aggregate.budget.estado),
        )
        .map((aggregate) => aggregate.budget.categoria),
    ).size;
    const overspendActive = budgets.filter(
      (aggregate) => aggregate.budget.estado === 'SOBREGASTO',
    ).length;
    const projectedCloseTotal = budgets.reduce(
      (sum, aggregate) => sum + aggregate.execution.proyeccionCierre,
      0,
    );

    return {
      totalApproved,
      totalConsumed,
      totalAvailable,
      riskCategories,
      overspendActive,
      projectedCloseTotal,
    };
  }

  private buildCharts(budgets: BudgetManagementAggregate[]): BudgetManagementCharts {
    return {
      planVsRealByCenter: this.aggregateComparison(
        budgets,
        (aggregate) => this.formatCostCenterLabel(aggregate.budget.centroCosto),
      ),
      projectionByCategory: this.aggregateComparison(
        budgets,
        (aggregate) => aggregate.budget.categoria,
      ),
    };
  }

  private aggregateComparison(
    budgets: BudgetManagementAggregate[],
    labelSelector: (aggregate: BudgetManagementAggregate) => string,
  ): Array<{ label: string; plan: number; real: number; projected: number }> {
    const map = new Map<
      string,
      { label: string; plan: number; real: number; projected: number }
    >();

    budgets.forEach((aggregate) => {
      const label = labelSelector(aggregate);
      const current = map.get(label) ?? {
        label,
        plan: 0,
        real: 0,
        projected: 0,
      };

      current.plan += aggregate.budget.valorAprobado + aggregate.budget.valorAjustado;
      current.real += aggregate.execution.valorConsumido;
      current.projected += aggregate.execution.proyeccionCierre;
      map.set(label, current);
    });

    return Array.from(map.values())
      .sort((left, right) => right.projected - left.projected)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        plan: this.roundCurrency(item.plan),
        real: this.roundCurrency(item.real),
        projected: this.roundCurrency(item.projected),
      }));
  }

  private buildDashboardAlerts(
    budgets: BudgetManagementAggregate[],
    severity: BudgetManagementAlertSeverity | 'TODAS',
  ): BudgetManagementAlert[] {
    return budgets
      .flatMap((aggregate) => aggregate.alerts)
      .filter((alert) => severity === 'TODAS' || alert.severidad === severity)
      .sort((left, right) => this.compareSeverity(right.severidad, left.severidad))
      .slice(0, 18)
      .map((alert) => ({ ...alert }));
  }

  private recalculateAggregate(aggregate: BudgetManagementAggregate): BudgetManagementAggregate {
    const budget = { ...aggregate.budget };
    const history = aggregate.history
      .map((item) => ({ ...item }))
      .sort((left, right) => left.fecha.localeCompare(right.fecha));
    const profile = this.resolveProfile(budget.centroCosto, budget.categoria);
    const effectiveBudget = budget.valorAprobado + budget.valorAjustado;
    const consumed = this.roundCurrency(
      history
        .filter((movement) => movement.tipoMovimiento === 'CONSUMO')
        .reduce((sum, movement) => sum + movement.valor, 0),
    );
    const progress = this.resolvePeriodProgress(budget.anio, budget.mes);
    const projectedClose =
      progress >= 1
        ? consumed
        : this.roundCurrency(
            (consumed / Math.max(progress, 0.35)) * PROFILE_CONFIG[profile].projectionBias,
          );
    const saldoDisponible = this.roundCurrency(effectiveBudget - consumed);
    const deviationReference = progress >= 1 ? consumed : projectedClose;
    const desviacionPct = effectiveBudget
      ? Math.round(((deviationReference - effectiveBudget) / effectiveBudget) * 100)
      : 0;
    const alerts = this.buildAlerts(
      budget,
      consumed,
      projectedClose,
      saldoDisponible,
      desviacionPct,
    );
    const execution: BudgetManagementExecution = {
      id: `execution-${budget.id}`,
      presupuestoId: budget.id,
      valorConsumido: consumed,
      saldoDisponible,
      desviacionPct,
      proyeccionCierre: projectedClose,
      riesgoPrincipal: this.resolveRiskPrincipal(alerts),
      severidad: this.resolveExecutionSeverity(alerts),
    };

    budget.estado = this.resolveStatus(budget, execution);

    return {
      budget,
      execution,
      alerts,
      history,
    };
  }

  private buildAlerts(
    budget: BudgetManagement,
    consumed: number,
    projectedClose: number,
    saldoDisponible: number,
    desviacionPct: number,
  ): BudgetManagementAlert[] {
    const effectiveBudget = budget.valorAprobado + budget.valorAjustado;
    const consumptionPct = effectiveBudget ? consumed / effectiveBudget : 0;
    const alerts: BudgetManagementAlert[] = [];

    if (consumed > effectiveBudget) {
      alerts.push(
        this.buildAlert(
          budget,
          'SOBREGASTO',
          'ALTA',
          `El consumo ya supera el presupuesto disponible en ${this.formatCurrency(
            consumed - effectiveBudget,
          )}.`,
        ),
      );
    }

    if (projectedClose > effectiveBudget * 1.05) {
      alerts.push(
        this.buildAlert(
          budget,
          'PROYECCION_EXCESO',
          projectedClose > effectiveBudget * 1.12 ? 'ALTA' : 'MEDIA',
          `La proyeccion de cierre apunta a ${this.formatCurrency(projectedClose)}, por encima del plan.`,
        ),
      );
    }

    if (desviacionPct >= 4) {
      alerts.push(
        this.buildAlert(
          budget,
          'RIESGO_DESVIACION',
          desviacionPct >= 10 ? 'ALTA' : 'MEDIA',
          `La desviacion esperada del periodo es ${desviacionPct}% frente al presupuesto.`,
        ),
      );
    }

    if (consumptionPct >= 0.82 && consumed <= effectiveBudget) {
      alerts.push(
        this.buildAlert(
          budget,
          'CONSUMO_CRITICO',
          consumptionPct >= 0.92 ? 'ALTA' : 'BAJA',
          `El consumo ya comprometio ${Math.round(consumptionPct * 100)}% del presupuesto disponible.`,
        ),
      );
    }

    if (!alerts.length && saldoDisponible < effectiveBudget * 0.18) {
      alerts.push(
        this.buildAlert(
          budget,
          'CONSUMO_CRITICO',
          'BAJA',
          'El saldo disponible esta por debajo del 18% y requiere seguimiento cercano.',
        ),
      );
    }

    return alerts.sort((left, right) =>
      this.compareSeverity(right.severidad, left.severidad),
    );
  }

  private buildAlert(
    budget: BudgetManagement,
    tipo: BudgetManagementAlert['tipo'],
    severidad: BudgetManagementAlertSeverity,
    descripcion: string,
  ): BudgetManagementAlert {
    return {
      id: `alert-${budget.id}-${tipo}`,
      presupuestoId: budget.id,
      tipo,
      severidad,
      descripcion,
      centroCosto: this.formatCostCenterLabel(budget.centroCosto),
      categoria: budget.categoria,
      tipoAbastecimiento: budget.tipoAbastecimiento,
    };
  }

  private buildSeedHistory(
    budget: BudgetManagement,
    profile: SeedProfile,
    monthKey: string,
  ): BudgetManagementHistory[] {
    const config = PROFILE_CONFIG[profile];
    const effectiveBudget = budget.valorAprobado + budget.valorAjustado;
    const currentMonthKey = this.toMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);
    const progress = this.resolvePeriodProgress(budget.anio, budget.mes);
    const projectedClose = this.roundCurrency(effectiveBudget * config.projectionRate);
    const consumed =
      monthKey === currentMonthKey
        ? this.roundCurrency((projectedClose / config.projectionBias) * progress)
        : projectedClose;
    const reserve = this.roundCurrency(effectiveBudget * config.reserveRate);
    const release = this.roundCurrency(reserve * config.releaseRate);
    const consumptionParts = this.splitAmount(consumed, 3);
    const history: BudgetManagementHistory[] = [
      this.buildMovement(
        budget.id,
        'RESERVA',
        `Reserva ${budget.categoria} ${this.formatMonthLabel(budget.mes)}`,
        reserve,
        this.buildIsoDate(budget.anio, budget.mes, 3),
        'demo.scm-budgets',
      ),
    ];

    if (budget.valorAjustado !== 0) {
      history.push(
        this.buildMovement(
          budget.id,
          'AJUSTE',
          `Ajuste aprobado ${budget.categoria}`,
          budget.valorAjustado,
          this.buildIsoDate(budget.anio, budget.mes, 8),
          'demo.scm-budgets',
        ),
      );
    }

    history.push(
      this.buildMovement(
        budget.id,
        'CONSUMO',
        `OC-${budget.anio}${String(budget.mes).padStart(2, '0')}-${this.slugify(
          budget.categoria,
        )}-01`,
        consumptionParts[0],
        this.buildIsoDate(budget.anio, budget.mes, 10),
        'demo.analista-compras',
      ),
      this.buildMovement(
        budget.id,
        'CONSUMO',
        `OC-${budget.anio}${String(budget.mes).padStart(2, '0')}-${this.slugify(
          budget.centroCosto,
        )}-02`,
        consumptionParts[1],
        this.buildIsoDate(budget.anio, budget.mes, 17),
        'demo.coordinacion-scm',
      ),
      this.buildMovement(
        budget.id,
        'CONSUMO',
        `OC-${budget.anio}${String(budget.mes).padStart(2, '0')}-${this.slugify(
          budget.tipoAbastecimiento,
        )}-03`,
        consumptionParts[2],
        this.buildIsoDate(
          budget.anio,
          budget.mes,
          monthKey === currentMonthKey ? Math.min(this.currentDay(), 22) : 24,
        ),
        'demo.control-gasto',
      ),
    );

    if (release > 0) {
      history.push(
        this.buildMovement(
          budget.id,
          'LIBERACION',
          `Liberacion parcial ${budget.categoria}`,
          release,
          this.buildIsoDate(budget.anio, budget.mes, 26),
          'demo.control-gasto',
        ),
      );
    }

    return history;
  }

  private buildSpendSeeds(companyId: string, monthKeys: string[]): Map<string, number> {
    const map = new Map<string, number>();
    const latestAnalysis = this.readLatestPurchaseAnalysis(companyId);

    latestAnalysis?.details.forEach((detail) => {
      const monthKey = detail.fechaCompra.slice(0, 7);

      if (!monthKeys.includes(monthKey)) {
        return;
      }

      const category = detail.categoria as BudgetManagementCategory;

      if (!BUDGET_MANAGEMENT_CATEGORIES.includes(category)) {
        return;
      }

      const key = `${monthKey}|${category}`;
      map.set(key, this.roundCurrency((map.get(key) ?? 0) + detail.valorTotal));
    });

    if (map.size === 0) {
      this.buildFallbackSpendSeeds(companyId, monthKeys).forEach((value, key) => map.set(key, value));
    } else {
      this.buildFallbackSpendSeeds(companyId, monthKeys).forEach((value, key) => {
        if (!map.has(key)) {
          map.set(key, value);
        }
      });
    }

    return map;
  }

  private buildFallbackSpendSeeds(companyId: string, monthKeys: string[]): Map<string, number> {
    const suppliers = this.readSuppliers(companyId);
    const map = new Map<string, number>();

    monthKeys.forEach((monthKey, monthIndex) => {
      BUDGET_MANAGEMENT_CATEGORIES.forEach((category) => {
        const relatedSuppliers = suppliers.filter(
          (supplier) => this.resolveCategoryFromSupplier(supplier) === category,
        );

        const supplierBase = relatedSuppliers.length
          ? relatedSuppliers.reduce(
              (sum, supplier) =>
                sum +
                ((supplier.moq ?? 60) *
                  (supplier.leadTimeDias ?? 4) *
                  this.resolveSupplierUnitPrice(category, supplier.tipoAbastecimiento)),
              0,
            )
          : CATEGORY_CONFIG[category].fallback * 0.32;

        const seasonalFactor = 0.92 + monthIndex * 0.08;
        map.set(
          `${monthKey}|${category}`,
          this.roundCurrency(
            Math.max(CATEGORY_CONFIG[category].fallback * 0.38, supplierBase * seasonalFactor),
          ),
        );
      });
    });

    return map;
  }

  private readLatestPurchaseAnalysis(companyId: string): PurchaseAnalysisAggregate | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(PURCHASE_ANALYSIS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as PurchaseAnalysisStore;

      return (parsed.analyses ?? [])
        .filter((aggregate) => aggregate.analysis?.empresaId === companyId)
        .sort(
          (left, right) =>
            new Date(right.analysis.creadoEn).getTime() -
            new Date(left.analysis.creadoEn).getTime(),
        )[0] ?? null;
    } catch {
      return null;
    }
  }

  private readSuppliers(companyId: string): Supplier[] {
    if (typeof window === 'undefined') {
      return INITIAL_SUPPLIERS_STORE.suppliers
        .filter((supplier) => supplier.empresaId === companyId)
        .map((supplier) => ({ ...supplier }));
    }

    const raw = localStorage.getItem(SUPPLIERS_STORAGE_KEY);

    if (!raw) {
      return INITIAL_SUPPLIERS_STORE.suppliers
        .filter((supplier) => supplier.empresaId === companyId)
        .map((supplier) => ({ ...supplier }));
    }

    try {
      const parsed = JSON.parse(raw) as SupplierStore;
      return (parsed.suppliers ?? [])
        .filter((supplier) => supplier.empresaId === companyId)
        .map((supplier) => ({ ...supplier }));
    } catch {
      return INITIAL_SUPPLIERS_STORE.suppliers
        .filter((supplier) => supplier.empresaId === companyId)
        .map((supplier) => ({ ...supplier }));
    }
  }

  private matchesFilters(
    aggregate: BudgetManagementAggregate,
    filters: BudgetManagementFilters,
  ): boolean {
    return (
      aggregate.budget.anio === filters.anio &&
      aggregate.budget.mes === filters.mes &&
      (!filters.centroCosto || aggregate.budget.centroCosto === filters.centroCosto) &&
      (!filters.categoria || aggregate.budget.categoria === filters.categoria) &&
      (!filters.tipoAbastecimiento ||
        aggregate.budget.tipoAbastecimiento === filters.tipoAbastecimiento) &&
      (filters.estado === 'TODOS' || aggregate.budget.estado === filters.estado) &&
      (filters.severidad === 'TODAS' || aggregate.execution.severidad === filters.severidad)
    );
  }

  private cloneAggregate(
    aggregate: BudgetManagementAggregate,
    severity: BudgetManagementAlertSeverity | 'TODAS',
  ): BudgetManagementAggregate {
    return {
      budget: { ...aggregate.budget },
      execution: { ...aggregate.execution },
      alerts: aggregate.alerts
        .filter((alert) => severity === 'TODAS' || alert.severidad === severity)
        .map((alert) => ({ ...alert })),
      history: aggregate.history.map((movement) => ({ ...movement })),
    };
  }

  private sanitizeAggregate(aggregate: BudgetManagementAggregate): Record<string, unknown> {
    return {
      budget: {
        id: aggregate.budget.id,
        anio: aggregate.budget.anio,
        mes: aggregate.budget.mes,
        centroCosto: aggregate.budget.centroCosto,
        categoria: aggregate.budget.categoria,
        tipoAbastecimiento: aggregate.budget.tipoAbastecimiento,
        valorAprobado: aggregate.budget.valorAprobado,
        valorAjustado: aggregate.budget.valorAjustado,
        estado: aggregate.budget.estado,
      },
      execution: {
        valorConsumido: aggregate.execution.valorConsumido,
        saldoDisponible: aggregate.execution.saldoDisponible,
        desviacionPct: aggregate.execution.desviacionPct,
        proyeccionCierre: aggregate.execution.proyeccionCierre,
        severidad: aggregate.execution.severidad,
      },
      alerts: aggregate.alerts.slice(0, 6).map((alert) => ({ ...alert })),
      history: aggregate.history.slice(-5).map((movement) => ({ ...movement })),
    };
  }

  private buildAuditDraft(
    action: BudgetManagementAuditDraft['action'],
    aggregate: BudgetManagementAggregate,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): BudgetManagementAuditDraft {
    return {
      module: 'gestion-presupuesto',
      action,
      companyId: aggregate.budget.empresaId,
      companyName: aggregate.budget.empresaNombre,
      entityId: aggregate.budget.id,
      entityName: `${aggregate.budget.categoria} · ${this.formatCostCenterLabel(
        aggregate.budget.centroCosto,
      )}`,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private buildMovement(
    presupuestoId: string,
    tipoMovimiento: BudgetManagementMovementType,
    referencia: string,
    valor: number,
    fecha: string,
    usuario: string,
  ): BudgetManagementHistory {
    return {
      id: `${presupuestoId}-${tipoMovimiento}-${this.slugify(referencia)}-${Date.parse(fecha)}`,
      presupuestoId,
      tipoMovimiento,
      referencia,
      valor: this.roundCurrency(valor),
      fecha,
      usuario,
    };
  }

  private resolveProfile(
    center: CostCenterCode,
    category: BudgetManagementCategory,
  ): SeedProfile {
    const key = `${center}|${category}`;
    const profiles: Record<string, SeedProfile> = {
      'PRODUCCION|Materias primas': 'CONTROLADO',
      'COMPRAS|Materias primas': 'AJUSTADO',
      'CALIDAD|Materias primas': 'EN_RIESGO',
      'PRODUCCION|Insumos': 'AJUSTADO',
      'CALIDAD|Insumos': 'EN_RIESGO',
      'BODEGA|Insumos': 'CONTROLADO',
      'COMPRAS|Insumos': 'EN_RIESGO',
      'MANTENIMIENTO|Repuestos': 'SOBREGASTO',
      'PRODUCCION|Repuestos': 'EN_RIESGO',
      'LOGISTICA|Etiquetas': 'CONTROLADO',
      'CALIDAD|Etiquetas': 'AJUSTADO',
      'COMPRAS|Etiquetas': 'CONTROLADO',
      'LOGISTICA|Empaques': 'EN_RIESGO',
      'BODEGA|Empaques': 'AJUSTADO',
      'PRODUCCION|Empaques': 'CONTROLADO',
      'LOGISTICA|Embalajes': 'SOBREGASTO',
      'BODEGA|Embalajes': 'EN_RIESGO',
    };

    return profiles[key] ?? 'CONTROLADO';
  }

  private resolveStatus(
    budget: BudgetManagement,
    execution: BudgetManagementExecution,
  ): BudgetManagementStatus {
    const effectiveBudget = budget.valorAprobado + budget.valorAjustado;

    if (
      execution.valorConsumido > effectiveBudget ||
      execution.proyeccionCierre > effectiveBudget * 1.08
    ) {
      return 'SOBREGASTO';
    }

    if (
      execution.proyeccionCierre > effectiveBudget ||
      execution.valorConsumido > effectiveBudget * 0.84
    ) {
      return 'EN_RIESGO';
    }

    if (budget.valorAjustado !== 0) {
      return 'AJUSTADO';
    }

    return 'CONTROLADO';
  }

  private resolveRiskPrincipal(alerts: BudgetManagementAlert[]): string {
    return alerts[0]?.tipo ?? 'CONTROLADO';
  }

  private resolveExecutionSeverity(alerts: BudgetManagementAlert[]): BudgetManagementAlertSeverity {
    return alerts[0]?.severidad ?? 'BAJA';
  }

  private normalizeFilters(filters: BudgetManagementFilters): BudgetManagementFilters {
    return {
      ...DEFAULT_BUDGET_MANAGEMENT_FILTERS,
      ...filters,
      centroCosto: filters.centroCosto ?? null,
      categoria: filters.categoria ?? null,
      tipoAbastecimiento: filters.tipoAbastecimiento ?? null,
      estado: filters.estado ?? 'TODOS',
      severidad: filters.severidad ?? 'TODAS',
    };
  }

  private buildSeedMonths(): string[] {
    const months: string[] = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 2);

    for (let index = 0; index < 3; index += 1) {
      months.push(this.toMonthKey(cursor.getFullYear(), cursor.getMonth() + 1));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }

  private toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private buildIsoDate(year: number, month: number, day: number): string {
    const safeDay = Math.min(day, this.daysInMonth(year, month));
    return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  private resolvePeriodProgress(year: number, month: number): number {
    const now = new Date();
    const currentKey = this.toMonthKey(now.getFullYear(), now.getMonth() + 1);
    const budgetKey = this.toMonthKey(year, month);

    if (budgetKey !== currentKey) {
      return 1;
    }

    return Math.min(0.92, Math.max(0.35, now.getDate() / this.daysInMonth(year, month)));
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private currentDay(): number {
    return new Date().getDate();
  }

  private splitAmount(amount: number, parts: number): number[] {
    const values: number[] = [];
    let remaining = this.roundCurrency(amount);

    for (let index = 0; index < parts; index += 1) {
      if (index === parts - 1) {
        values.push(this.roundCurrency(remaining));
        break;
      }

      const weight = index === 0 ? 0.34 : index === 1 ? 0.33 : 0.33;
      const value = this.roundCurrency(amount * weight);
      values.push(value);
      remaining -= value;
    }

    return values;
  }

  private roundCurrency(value: number): number {
    return Math.round(value / 1000) * 1000;
  }

  private resolveCompanyName(companyId: string): string {
    return COMPANY_DISPLAY_NAMES[companyId] ?? 'Empresa activa';
  }

  private formatMonthLabel(month: number): string {
    return MONTH_LABELS[month - 1] ?? `Mes ${month}`;
  }

  private formatCostCenterLabel(center: CostCenterCode): string {
    return (
      BUDGET_COST_CENTER_OPTIONS.find((item) => item.value === center)?.label ?? center
    );
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private compareSeverity(
    left: BudgetManagementAlertSeverity,
    right: BudgetManagementAlertSeverity,
  ): number {
    const weight: Record<BudgetManagementAlertSeverity, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    return weight[left] - weight[right];
  }

  private sortBudgets(left: BudgetManagementAggregate, right: BudgetManagementAggregate): number {
    const severityDifference = this.compareSeverity(
      right.execution.severidad,
      left.execution.severidad,
    );

    if (severityDifference !== 0) {
      return severityDifference;
    }

    if (right.execution.desviacionPct !== left.execution.desviacionPct) {
      return right.execution.desviacionPct - left.execution.desviacionPct;
    }

    return (
      new Date(right.budget.actualizadoEn).getTime() -
      new Date(left.budget.actualizadoEn).getTime()
    );
  }

  private resolveCategoryFromSupplier(supplier: Supplier): BudgetManagementCategory {
    const normalizedProduct = this.normalizeText(supplier.productoPrincipal);

    if (normalizedProduct.includes('repuesto')) {
      return 'Repuestos';
    }

    if (normalizedProduct.includes('etiquet')) {
      return 'Etiquetas';
    }

    if (normalizedProduct.includes('empaque')) {
      return 'Empaques';
    }

    if (normalizedProduct.includes('embal')) {
      return 'Embalajes';
    }

    if (normalizedProduct.includes('quim') || normalizedProduct.includes('solido')) {
      return 'Insumos';
    }

    return 'Materias primas';
  }

  private resolveSupplierUnitPrice(
    category: BudgetManagementCategory,
    supplyType: BudgetSupplyType,
  ): number {
    const base =
      category === 'Materias primas'
        ? 11800
        : category === 'Insumos'
          ? 7600
          : category === 'Repuestos'
            ? 28400
            : category === 'Etiquetas'
              ? 260
              : category === 'Empaques'
                ? 320
                : 540;

    return supplyType === 'LOGISTICA' ? Math.round(base * 1.07) : base;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private slugify(value: string): string {
    return this.normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private emptyExecution(presupuestoId: string): BudgetManagementExecution {
    return {
      id: `execution-${presupuestoId}`,
      presupuestoId,
      valorConsumido: 0,
      saldoDisponible: 0,
      desviacionPct: 0,
      proyeccionCierre: 0,
      riesgoPrincipal: 'CONTROLADO',
      severidad: 'BAJA',
    };
  }
}
