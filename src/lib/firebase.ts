import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { EventItem, UserRole, UserAuth } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

// Initialize Firebase
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfigData as any).firestoreDatabaseId || undefined);

// Admin emails list from env or default owner
const ADMIN_EMAILS = ((import.meta as any).env?.VITE_ADMIN_EMAILS || 'dcalibri@gmail.com')
  .toLowerCase()
  .split(',')
  .map((e) => e.trim());

// Seed Initial Events if database is empty
const INITIAL_EVENTS: Omit<EventItem, 'id'>[] = [
  {
    title: 'Design System & Architecture Sync',
    type: 'work',
    start: getTodayDateString(),
    startTime: '10:00',
    end: getTodayDateString(),
    endTime: '11:30',
    location: 'Conference Room B & Google Meet',
    added: getTodayDateString(),
    status: 'approved',
    requestedBy: 'dcalibri@gmail.com',
  },
  {
    title: 'Community Tech Meetup & Lightning Talks',
    type: 'social',
    start: getTodayDateString(),
    startTime: '18:00',
    end: getTodayDateString(),
    endTime: '20:30',
    location: 'Innovation Hub, Floor 3',
    added: getTodayDateString(),
    status: 'approved',
    requestedBy: 'sarah.dev@example.com',
  },
  {
    title: 'Submit Q3 Event Inbox Roadmap',
    type: 'reminder',
    start: getTodayDateString(),
    startTime: '16:00',
    end: getTodayDateString(),
    endTime: '16:30',
    location: 'Remote',
    added: getTodayDateString(),
    status: 'pending',
    requestedBy: 'alex.community@example.com',
  },
];

export async function fetchUserRole(email: string | null): Promise<UserRole> {
  if (!email) return 'viewer';
  const cleanEmail = email.toLowerCase().trim();

  // Explicit env check
  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return 'admin';
  }

  try {
    const roleDocRef = doc(db, 'roles', cleanEmail);
    const snap = await getDoc(roleDocRef);
    if (snap.exists() && snap.data().role) {
      return snap.data().role as UserRole;
    }
  } catch (err) {
    console.warn('Error reading user role from Firestore, defaulting:', err);
  }

  return 'viewer';
}

export async function saveUserRole(email: string, role: UserRole): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const roleDocRef = doc(db, 'roles', cleanEmail);
    await setDoc(roleDocRef, { email: cleanEmail, role }, { merge: true });
  } catch (err) {
    console.error('Failed to save user role:', err);
    throw err;
  }
}

// Subscribe to events real-time
export function subscribeToEvents(onUpdate: (events: EventItem[]) => void) {
  const eventsCol = collection(db, 'events');
  const q = query(eventsCol, orderBy('added', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed database if empty
        console.log('Events collection empty. Seeding initial events...');
        for (const item of INITIAL_EVENTS) {
          await addDoc(eventsCol, { ...item, createdAt: Date.now() });
        }
        return;
      }

      const events: EventItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Untitled',
          type: data.type || 'other',
          start: data.start || getTodayDateString(),
          startTime: data.startTime || '09:00',
          end: data.end || data.start || getTodayDateString(),
          endTime: data.endTime || '10:00',
          location: data.location || '',
          added: data.added || getTodayDateString(),
          status: data.status || 'approved',
          requestedBy: data.requestedBy || null,
          createdAt: data.createdAt || 0,
        };
      });

      onUpdate(events);
    },
    (error) => {
      console.error('Firestore subscribe error:', error);
    }
  );
}

// Add event
export async function createEvent(eventData: Omit<EventItem, 'id'>): Promise<string> {
  const eventsCol = collection(db, 'events');
  const docRef = await addDoc(eventsCol, {
    ...eventData,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// Update event
export async function updateEvent(id: string, updates: Partial<EventItem>): Promise<void> {
  const eventRef = doc(db, 'events', id);
  await updateDoc(eventRef, updates);
}

// Delete event
export async function deleteEvent(id: string): Promise<void> {
  const eventRef = doc(db, 'events', id);
  await deleteDoc(eventRef);
}

// Cached Google OAuth Access Token in memory
let cachedGoogleAccessToken: string | null = null;

export function getGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function setGoogleAccessToken(token: string | null): void {
  cachedGoogleAccessToken = token;
}

// Google Sign-In with fallback & Sheets scope
export async function loginWithGoogle(): Promise<UserAuth> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
  
  try {
    const res = await signInWithPopup(auth, provider);
    const user = res.user;
    const credential = GoogleAuthProvider.credentialFromResult(res);
    const token = credential?.accessToken || null;
    if (token) {
      cachedGoogleAccessToken = token;
    }

    const role = await fetchUserRole(user.email);
    return {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      uid: user.uid,
      role,
      isGuest: false,
      googleAccessToken: token || undefined,
      photoURL: user.photoURL,
    };
  } catch (err: any) {
    console.warn('Google sign-in popup error/blocked:', err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  cachedGoogleAccessToken = null;
}

