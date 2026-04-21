export interface QualityControlKpis {
  totalInspections: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  quarantineCount: number;
  openNonConformities: number;
}
