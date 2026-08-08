import React from 'react';
import { FileText, CheckCircle2, Shield, Clock, PlusCircle } from 'lucide-react';
import { EventItem, UserAuth } from '../types';
import { EventCard } from './EventCard';

interface DraftsTabProps {
  events: EventItem[];
  currentUser: UserAuth;
  onUpdateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDuplicateEvent: (event: EventItem) => Promise<void>;
  onApproveEvent: (id: string) => Promise<void>;
  onRejectEvent: (id: string) => Promise<void>;
  onNavigateToAdd: () => void;
}

export const DraftsTab: React.FC<DraftsTabProps> = ({
  events,
  currentUser,
  onUpdateEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onApproveEvent,
  onRejectEvent,
  onNavigateToAdd,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Filter pending/draft events
  const allPendingEvents = events.filter((e) => e.status === 'pending');
  const visibleDrafts = isAdmin
    ? allPendingEvents
    : currentUser.email
    ? allPendingEvents.filter(
        (e) => e.requestedBy?.toLowerCase() === currentUser.email?.toLowerCase()
      )
    : allPendingEvents;

  const handleApproveAll = async () => {
    if (visibleDrafts.length === 0) return;
    if (confirm(`Approve all ${visibleDrafts.length} draft suggestions?`)) {
      for (const draft of visibleDrafts) {
        await onApproveEvent(draft.id);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Top Header & Bulk Approve Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#2C2C2E] pb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>Pending Review Queue</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 font-mono font-extrabold">
              {visibleDrafts.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-0.5">
            {isAdmin
              ? 'Review, edit, approve, or reject user-submitted event drafts.'
              : 'Track status of your submitted event suggestions.'}
          </p>
        </div>

        {isAdmin && visibleDrafts.length > 0 && (
          <button
            onClick={handleApproveAll}
            className="self-start sm:self-auto flex items-center space-x-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve All ({visibleDrafts.length})</span>
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex items-start space-x-3 text-xs text-blue-900 dark:text-blue-300">
        {isAdmin ? (
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <p className="font-bold">
            {isAdmin ? 'Admin Moderation Queue' : 'Draft Suggestion Tracker'}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
            {isAdmin
              ? 'Draft suggestions remain hidden from standard calendar views until approved by an administrator.'
              : 'Your suggestions are waiting for an administrator to review and publish them to the shared calendar.'}
          </p>
        </div>
      </div>

      {/* Draft List */}
      {visibleDrafts.length > 0 ? (
        <div className="space-y-4">
          {visibleDrafts.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currentUser={currentUser}
              onUpdate={onUpdateEvent}
              onDelete={onDeleteEvent}
              onDuplicate={onDuplicateEvent}
              onApprove={onApproveEvent}
              onReject={onRejectEvent}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-center text-slate-400 dark:text-[#8E8E93]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Pending Drafts</h3>
            <p className="text-xs text-slate-500 dark:text-[#8E8E93] max-w-sm mx-auto mt-1">
              There are currently no event drafts or suggestions waiting for review. All calendar events are active.
            </p>
          </div>
          <button
            onClick={onNavigateToAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit a New Suggestion</span>
          </button>
        </div>
      )}
    </div>
  );
};
