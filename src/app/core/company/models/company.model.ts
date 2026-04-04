export interface Company {
  id: string;
  backendId?: string | null;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  accentColor?: string;
}
