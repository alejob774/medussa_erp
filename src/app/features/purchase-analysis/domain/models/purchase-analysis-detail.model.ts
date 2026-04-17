export interface PurchaseAnalysisDetail {
  id: string;
  analisisId: string;
  proveedorId: string;
  proveedorNombre: string;
  categoria: string;
  tipoAbastecimiento: string;
  ciudad: string;
  fechaCompra: string;
  valorTotal: number;
  precioUnitario: number;
  leadTimeDias: number;
  calidadScore: number;
  cumplimientoScore: number;
  participacionCategoriaPct: number;
  variacionPrecioPct: number;
  oportunidadAhorro: number;
  riesgoPrincipal: string | null;
}
