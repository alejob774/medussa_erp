import { BomFormulaAggregate } from './bom-formula.model';
import { DEFAULT_BOM_FORMULA_FILTERS, BomFormulaFilters } from './bom-formula-filters.model';
import { BomFormulaHistory } from './bom-formula-history.model';
import { BomFormulaKpis } from './bom-formula-kpi.model';
import { BomFormulaStatus } from './bom-status.model';
import { MeasurementUnit } from './measurement-unit.model';

export interface BomFormulaIngredientCatalogItem {
  id: string;
  code: string;
  name: string;
  defaultUnit: MeasurementUnit;
  defaultCost: number;
  source: 'PRODUCTO' | 'LOCAL';
  supplierName: string | null;
}

export interface BomFormulaCatalogs {
  finishedProducts: Array<{ value: string; label: string; productCode: string; productName: string }>;
  ingredientOptions: BomFormulaIngredientCatalogItem[];
  statuses: Array<{ value: BomFormulaStatus | 'TODOS'; label: string }>;
  draftStatuses: Array<{ value: Extract<BomFormulaStatus, 'BORRADOR' | 'PENDIENTE'>; label: string }>;
  vigenciaOptions: Array<{ value: BomFormulaFilters['vigencia']; label: string }>;
  units: Array<{ value: MeasurementUnit; label: string }>;
  packagingOptions: Array<{ value: string; label: string }>;
  approvers: Array<{ value: string; label: string }>;
  versions: Array<{ value: string; label: string }>;
}

export interface BomFormulaDashboard {
  filters: BomFormulaFilters;
  catalogs: BomFormulaCatalogs;
  kpis: BomFormulaKpis;
  formulas: BomFormulaAggregate[];
  histories: BomFormulaHistory[];
  selectedFormula: BomFormulaAggregate | null;
}

export interface BomFormulaAuditDraft {
  module: 'bom-formulas';
  action: 'seed' | 'create' | 'edit' | 'approve' | 'reject' | 'new-version';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface BomFormulaMutationResult {
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'new-version';
  formula: BomFormulaAggregate;
  message: string;
  auditDraft: BomFormulaAuditDraft;
}

export interface BomFormulaStore {
  formulas: BomFormulaAggregate[];
  histories: BomFormulaHistory[];
  auditTrail: BomFormulaAuditDraft[];
}

export const EMPTY_BOM_FORMULA_DASHBOARD: BomFormulaDashboard = {
  filters: { ...DEFAULT_BOM_FORMULA_FILTERS },
  catalogs: {
    finishedProducts: [],
    ingredientOptions: [],
    statuses: [],
    draftStatuses: [],
    vigenciaOptions: [],
    units: [],
    packagingOptions: [],
    approvers: [],
    versions: [],
  },
  kpis: {
    totalFormulas: 0,
    vigenteCount: 0,
    pendingCount: 0,
    obsoleteCount: 0,
    averageStandardCost: 0,
  },
  formulas: [],
  histories: [],
  selectedFormula: null,
};
