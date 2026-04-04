export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  roles: string[];
  roleName?: string | null;
  profileName?: string | null;
  permissions: string[];
}