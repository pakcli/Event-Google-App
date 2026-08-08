export type EventType = 'work' | 'social' | 'reminder' | 'other' | string;
export type EventStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'viewer';
export type EventSource = 'firestore' | 'google_sheet';

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  start: string;       // YYYY-MM-DD
  startTime: string;   // HH:MM
  end: string;         // YYYY-MM-DD
  endTime: string;     // HH:MM
  location: string;
  added: string;       // YYYY-MM-DD (read-only)
  status: EventStatus;
  requestedBy: string | null;
  createdAt?: number;
  source?: EventSource;
  sheetRowIndex?: number;
  tags?: string[];
  imageUrl?: string;
  stars?: number; // 0 to 5 star rating
}

export interface UserAuth {
  email: string | null;
  displayName: string | null;
  uid: string | null;
  role: UserRole;
  isGuest?: boolean;
  googleAccessToken?: string;
  photoURL?: string | null;
}

