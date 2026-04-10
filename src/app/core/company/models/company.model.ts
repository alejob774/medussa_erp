export interface Company {
  id: string;
  dbId?: string | null;
  backendId?: string | null;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  accentColor?: string;
}
