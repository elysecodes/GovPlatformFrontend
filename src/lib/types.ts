export type Role =
  | 'SUPER_ADMIN'
  | 'PROVINCE_ADMIN'
  | 'DISTRICT_ADMIN'
  | 'SECTOR_ADMIN'
  | 'CELL_ADMIN'
  | 'VILLAGE_ADMIN'
  | 'CITIZEN';

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  role: Role;
  roleName: string;
  level: number;
  profilePhoto?: string;
  citizenId?: number | null;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  permissions?: string[];
}

export interface Scope {
  role: string;
  level: number;
  provinceId: number | null;
  districtId: number | null;
  sectorId: number | null;
  cellId: number | null;
  villageId: number | null;
  citizenId: number | null;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
}

export interface UnitNode extends Unit {
  children?: UnitNode[];
}

export interface Complaint {
  id: number;
  complaintNo: string;
  title: string;
  description: string;
  location?: string;
  priority: string;
  status: string;
  category?: { id: number; name: string };
  citizen?: { user?: { fullName: string }; village?: Unit };
  village?: Unit;
  assignedOfficer?: { id: number; fullName: string };
  resolution?: string;
  resolutionDate?: string;
  createdAt: string;
  updatedAt: string;
  currentLevel: number;
  comments?: any[];
  escalations?: any[];
  attachments?: any[];
}

export interface ServiceRequest {
  id: number;
  requestNo: string;
  title: string;
  description: string;
  location?: string;
  status: string;
  serviceType?: { id: number; name: string };
  citizen?: { user?: { fullName: string } };
  village?: Unit;
  assignedOfficer?: { id: number; fullName: string };
  resolution?: string;
  createdAt: string;
  escalations?: any[];
  attachments?: any[];
}

export interface Report {
  id: number;
  reportNo: string;
  title: string;
  content: string;
  level: string;
  status: string;
  version: number;
  author?: { id: number; fullName: string };
  reviewedBy?: { id: number; fullName: string };
  reviewComment?: string;
  village?: Unit;
  createdAt: string;
  submittedAt?: string;
  reviews?: any[];
  attachments?: any[];
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  targetLevel: number;
  status: string;
  scopeAll: boolean;
  author?: { id: number; fullName: string };
  publicationDate: string;
  expirationDate?: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  location?: string;
  progress: number;
  status: string;
  budget: number;
  fundingSource?: string;
  beneficiaries: number;
  responsibleOfficer?: { id: number; fullName: string };
  village?: Unit;
  startDate?: string;
  expectedEndDate?: string;
  createdAt: string;
  updates?: any[];
  attachments?: any[];
}

export interface GovEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  location?: string;
  organizer?: string;
  status: string;
  report?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
