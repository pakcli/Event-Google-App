import React, { useState, useEffect, useMemo } from 'react';
import { EventItem, UserAuth, EventSource } from './types';
import {
  subscribeToEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  auth,
  fetchUserRole,
  loginWithGoogle,
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchGoogleSheetEvents } from './lib/googleSheets';
import { getTodayDateString } from './utils/dateUtils';
import { Header } from './components/Header';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { TodayTab } from './components/TodayTab';
import { AddTab } from './components/AddTab';
import { DraftsTab } from './components/DraftsTab';
import { AllEventsTab } from './components/AllEventsTab';
import { DataSourcesSidebar } from './components/DataSourcesSidebar';
import { AIChatDrawer } from './components/AIChatDrawer';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('event_inbox_active_tab') as ActiveTab) || 'today';
  });
  const [firestoreEvents, setFirestoreEvents] = useState<EventItem[]>([]);
  const [sheetEvents, setSheetEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Save activeTab preference
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('event_inbox_active_tab', activeTab);
    }
  }, [activeTab]);

  // Sidebar Open State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Google Sheet Sync State
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem('event_inbox_sheet_url') || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
  });
  const [sheetTitle, setSheetTitle] = useState<string | null>(null);
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Default initial persona (starts as Admin for dcalibri@gmail.com)
  const [currentUser, setCurrentUser] = useState<UserAuth>({
    email: 'dcalibri@gmail.com',
    displayName: 'dcalibri',
    uid: 'owner-admin',
    role: 'admin',
    isGuest: false,
  });

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Save sheetUrl to localStorage
  useEffect(() => {
    if (sheetUrl) {
      localStorage.setItem('event_inbox_sheet_url', sheetUrl);
    }
  }, [sheetUrl]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const role = await fetchUserRole(firebaseUser.email);
        setCurrentUser((prev) => ({
          ...prev,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          uid: firebaseUser.uid,
          role,
          isGuest: false,
          photoURL: firebaseUser.photoURL,
        }));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore events in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsubscribeEvents = subscribeToEvents((fetchedEvents) => {
      // Mark firestore events
      const tagged = fetchedEvents.map((e) => ({ ...e, source: 'firestore' as const }));
      setFirestoreEvents(tagged);
      setIsLoading(false);
    });

    return () => unsubscribeEvents();
  }, []);

  // Handler to sync events from Google Sheet (Admin Only)
  const handleSyncGoogleSheet = async () => {
    if (currentUser.role !== 'admin') {
      alert('Only Admins can sync Google Sheets.');
      return;
    }
    if (!sheetUrl.trim()) return;
    setIsSheetSyncing(true);
    try {
      const res = await fetchGoogleSheetEvents(sheetUrl, currentUser.googleAccessToken);
      setSheetEvents(res.events);
      setSheetTitle(res.sheetTitle);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      alert(err.message || 'Failed to sync Google Sheet.');
    } finally {
      setIsSheetSyncing(false);
    }
  };

  // Import sheet events into Firestore database (Admin Only)
  const handleImportSheetEventsToDb = async () => {
    if (currentUser.role !== 'admin') {
      alert('Only Admins can import Google Sheet events into Firestore.');
      return;
    }
    if (sheetEvents.length === 0) return;
    for (const item of sheetEvents) {
      const { id, source, sheetRowIndex, ...cleanData } = item;
      await createEvent({
        ...cleanData,
        status: cleanData.status || 'approved',
      });
    }
  };

  const handleLoginWithGoogle = async () => {
    try {
      const authUser = await loginWithGoogle();
      setCurrentUser(authUser);
    } catch (err: any) {
      alert('Google Sign-In popup error or blocked.');
    }
  };

  // Combine events from all sources into a unified synchronized list
  const combinedEvents = useMemo(() => {
    return [...firestoreEvents, ...sheetEvents];
  }, [firestoreEvents, sheetEvents]);

  // Count pending events for user or overall
  const pendingCount = combinedEvents.filter((e) => e.status === 'pending').length;
  const userPendingCount = combinedEvents.filter(
    (e) => e.status === 'pending' && currentUser.email && e.requestedBy?.toLowerCase() === currentUser.email.toLowerCase()
  ).length;

  // CRUD Handlers for Firestore Events
  const handleUpdateEvent = async (id: string, updates: Partial<EventItem>) => {
    try {
      if (id.startsWith('gsheet-')) {
        // Local update for Google Sheet preview event
        setSheetEvents((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
      } else {
        await updateEvent(id, updates);
      }
    } catch (err: any) {
      console.error('Failed to update event:', err);
      alert('Error updating event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      if (id.startsWith('gsheet-')) {
        setSheetEvents((prev) => prev.filter((item) => item.id !== id));
      } else {
        await deleteEvent(id);
      }
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      alert('Error deleting event: ' + err.message);
    }
  };

  const handleDuplicateEvent = async (event: EventItem) => {
    const isViewer = currentUser.role === 'viewer';
    if (isViewer && userPendingCount >= 5) {
      alert('You have 5 pending suggestions — wait for approval or delete one before adding more.');
      return;
    }

    const todayStr = getTodayDateString();
    const duplicatedData: Omit<EventItem, 'id'> = {
      title: `${event.title} (Copy)`,
      type: event.type,
      start: event.start,
      startTime: event.startTime,
      end: event.end,
      endTime: event.endTime,
      location: event.location,
      added: todayStr,
      status: isViewer ? 'pending' : 'approved',
      requestedBy: currentUser.email || 'anonymous',
    };

    try {
      await createEvent(duplicatedData);
    } catch (err: any) {
      alert('Failed to duplicate event: ' + err.message);
    }
  };

  const handleApproveEvent = async (id: string) => {
    try {
      if (id.startsWith('gsheet-')) {
        setSheetEvents((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
        );
      } else {
        await updateEvent(id, { status: 'approved' });
      }
    } catch (err: any) {
      alert('Error approving event: ' + err.message);
    }
  };

  const handleRejectEvent = async (id: string) => {
    try {
      if (id.startsWith('gsheet-')) {
        setSheetEvents((prev) => prev.filter((item) => item.id !== id));
      } else {
        await deleteEvent(id);
      }
    } catch (err: any) {
      alert('Error rejecting event: ' + err.message);
    }
  };

  const handleAddEvents = async (newEvents: Omit<EventItem, 'id'>[]) => {
    for (const item of newEvents) {
      await createEvent(item);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#050505] text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 selection:bg-blue-600/30">
      {/* Left Data Sources Sidebar Drawer */}
      <DataSourcesSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sheetUrl={sheetUrl}
        onSheetUrlChange={setSheetUrl}
        onSync={handleSyncGoogleSheet}
        isSyncing={isSheetSyncing}
        lastSyncedTime={lastSyncedTime}
        sheetTitle={sheetTitle}
        syncedCount={sheetEvents.length}
        firestoreCount={firestoreEvents.length}
        currentUser={currentUser}
        onLoginWithGoogle={handleLoginWithGoogle}
        onImportSheetEventsToDb={handleImportSheetEventsToDb}
      />

      {/* Top App Header */}
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        allEventsCount={combinedEvents.length}
        pendingCount={pendingCount}
        onOpenDataSourcesSidebar={() => setIsSidebarOpen(true)}
        onNavigateToPending={() => setActiveTab('pending')}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Stage with Light Tab Memory (DOM Keep-Alive) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 pt-3 pb-28">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 text-zinc-400">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Syncing Event Inbox with Firestore...</span>
          </div>
        ) : (
          <>
            {/* Today Tab Container */}
            <div className={activeTab === 'today' ? 'block' : 'hidden'}>
              <TodayTab
                events={combinedEvents}
                currentUser={currentUser}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onDuplicateEvent={handleDuplicateEvent}
                onApproveEvent={handleApproveEvent}
                onRejectEvent={handleRejectEvent}
                onNavigateToAdd={() => setActiveTab('add')}
              />
            </div>

            {/* Add Tab Container */}
            <div className={activeTab === 'add' ? 'block' : 'hidden'}>
              <AddTab
                currentUser={currentUser}
                userPendingCount={userPendingCount}
                onAddEvents={handleAddEvents}
                onNavigateToToday={() => setActiveTab('today')}
              />
            </div>

            {/* Pending Review Tab Container */}
            <div className={activeTab === 'drafts' || activeTab === 'pending' ? 'block' : 'hidden'}>
              <DraftsTab
                events={combinedEvents}
                currentUser={currentUser}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onDuplicateEvent={handleDuplicateEvent}
                onApproveEvent={handleApproveEvent}
                onRejectEvent={handleRejectEvent}
                onNavigateToAdd={() => setActiveTab('add')}
              />
            </div>

            {/* All Events Tab Container */}
            <div className={activeTab === 'all' ? 'block' : 'hidden'}>
              <AllEventsTab
                events={combinedEvents}
                currentUser={currentUser}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onDuplicateEvent={handleDuplicateEvent}
                onApproveEvent={handleApproveEvent}
                onRejectEvent={handleRejectEvent}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            </div>
          </>
        )}
      </main>

      {/* Mobile-first Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
        isAdmin={currentUser.role === 'admin'}
      />

      {/* Floating AI Assistant Launch Button (Always accessible) */}
      <button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-18 right-4 z-40 flex items-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3.5 py-2.5 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 font-bold text-xs"
        title="Open AI Schedule Assistant"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="hidden sm:inline">Ask AI Assistant</span>
        <span className="sm:hidden font-mono">AI</span>
      </button>

      {/* AI Schedule Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        events={combinedEvents}
        currentUser={currentUser}
        onCreateEvent={async (data) => {
          await createEvent(data);
        }}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
}

