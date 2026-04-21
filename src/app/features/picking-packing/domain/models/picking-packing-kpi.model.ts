export interface PickingPackingKpis {
  pendingOrders: number;
  readyOrders: number;
  shortageOrders: number;
  otifPreparationPct: number;
  topOperatorName: string;
  topOperatorLinesPerHour: number;
  averagePreparationMinutes: number;
}
