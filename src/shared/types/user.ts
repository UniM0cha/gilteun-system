export type UserRole = 'session' | 'leader' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  instrumentId: string;
  avatar?: string;
  customCommands: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Instrument {
  id: string;
  name: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  userId: string;
  worshipId: string;
  currentPage: number;
  isOnline: boolean;
  lastSeen: Date;
}
