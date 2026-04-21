export interface MpsPlanFilters {
  fechaInicio: string;
  fechaFin: string;
  planta: string | null;
  familia: string | null;
  skuId: string | null;
  considerarFEFO: boolean;
  considerarPedidosUrgentes: boolean;
}

export const DEFAULT_MPS_PLAN_FILTERS: MpsPlanFilters = {
  fechaInicio: todayDate(),
  fechaFin: dateOffset(6),
  planta: null,
  familia: null,
  skuId: null,
  considerarFEFO: true,
  considerarPedidosUrgentes: true,
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(offsetDays: number): string {
  const current = new Date();
  current.setDate(current.getDate() + offsetDays);
  return current.toISOString().slice(0, 10);
}
