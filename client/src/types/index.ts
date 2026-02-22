export interface Profile {
  id: string;
  name: string;
  roleId: string;
  color: string;
}

export interface Role {
  id: string;
  name: string;
  icon: string;
}

export interface WorshipType {
  id: string;
  name: string;
  color: string;
}

export interface Sheet {
  id: string;
  worshipId: string;
  fileName: string;
  title: string;
  imagePath: string;
  order: number;
  createdAt: string;
}

export interface Worship {
  id: string;
  title: string;
  date: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  sheets: Sheet[];
}

export interface Command {
  id: string;
  emoji: string;
  label: string;
  isDefault: boolean;
}
