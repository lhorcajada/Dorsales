export type UserRole = 'user' | 'admin';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthRegisterInput extends AuthCredentials {
  name: string;
  childName: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  childIds: string[];
}