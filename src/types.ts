export interface LedgerEntry {
  id: string;
  ledgerNumber: string;
  epf: string;
  zoneSection: string;
  createdAt: number;
}

export interface FileRecord {
  id: string;
  name: string;
  description: string;
  district: string;
  schoolDepartment?: string;
  currentHolderId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transfer {
  id: string;
  fileId: string;
  fromId: string;
  toId: string;
  district: string;
  schoolDepartment?: string;
  notes: string;
  timestamp: number;
}

export type Section = 'dashboard' | 'files' | 'transfer' | 'history' | 'ledger';
