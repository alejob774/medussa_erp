export interface CityCatalogItem {
  id: string;
  name: string;
  department?: string | null;
}

export const EMPTY_CITY_CATALOG: CityCatalogItem[] = [];