import { ZoneCatalogItem } from '../models/zone-catalog.model';

export const SHARED_ZONE_CATALOG: ZoneCatalogItem[] = [
  { value: 'Zona norte 1', label: 'Zona norte 1' },
  { value: 'Zona norte 2', label: 'Zona norte 2' },
  { value: 'Zona sur 1', label: 'Zona sur 1' },
  { value: 'Zona sur 2', label: 'Zona sur 2' },
  { value: 'Zona sur 3', label: 'Zona sur 3' },
];

const CITY_ZONE_MAP: Record<string, string> = {
  '05001': 'Zona norte 2',
  '08001': 'Zona norte 1',
  '11001': 'Zona norte 1',
  '13001': 'Zona norte 2',
  '17001': 'Zona sur 3',
  '54001': 'Zona norte 1',
  '66001': 'Zona sur 2',
  '68001': 'Zona norte 2',
  '73001': 'Zona sur 2',
  '76001': 'Zona sur 1',
};

export function resolveDefaultZoneByCityId(cityId: string | null | undefined): string {
  return CITY_ZONE_MAP[cityId ?? ''] ?? SHARED_ZONE_CATALOG[0].value;
}

export function normalizeZoneCatalog(
  zones: Array<ZoneCatalogItem | string> | null | undefined,
): ZoneCatalogItem[] {
  const normalizedZones = (zones ?? [])
    .map((zone) => {
      if (typeof zone === 'string') {
        const value = zone.trim();
        return value ? { value, label: value } : null;
      }

      const value = zone.value?.trim() ?? zone.label?.trim() ?? '';
      const label = zone.label?.trim() ?? value;
      return value ? { value, label } : null;
    })
    .filter((zone): zone is ZoneCatalogItem => zone !== null);

  return normalizedZones.length ? normalizedZones : SHARED_ZONE_CATALOG;
}