export interface TpmSparePart {
  id: string;
  otId: string;
  codigoRepuesto: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
}

export interface TpmSparePartCatalogItem {
  codigo: string;
  descripcion: string;
  costoUnitario: number;
  stockDisponible: number;
  stockMinimo: number;
}
