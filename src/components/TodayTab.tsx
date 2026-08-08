import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  RotateCcw,
  Clock,
  Shield,
  Sparkles,
  Settings,
  SlidersHorizontal,
  Search,
  Star,
  Filter,
  Image,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { EventItem, EventType, UserAuth } from '../types';
import { getTodayDateString, formatReadableDate, isEventOnDate } from '../utils/dateUtils';
import { EventCard } from './EventCard';
import { CategorySelect } from './CategorySelect';

interface TodayTabProps {
  events: EventItem[];
  currentUser: UserAuth;
  onUpdateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDuplicateEvent: (event: EventItem) => Promise<void>;
  onApproveEvent?: (id: string) => Promise<void>;
  onRejectEvent?: (id: string) => Promise<void>;
  onNavigateToAdd: () => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({
  events,
  currentUser,
  onUpdateEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onApproveEvent,
  onRejectEvent,
  onNavigateToAdd,
}) => {
  const todayStr = getTodayDateString();
  const isAdmin = currentUser.role === 'admin';

  // Settings & Filter states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [minStarsFilter, setMinStarsFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'time-asc' | 'time-desc' | 'stars-desc' | 'title-asc'>('time-asc');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Today's base approved events
  const rawTodayEvents = useMemo(() => {
    return events.filter(
      (e) => e.status === 'approved' && isEventOnDate(e, todayStr)
    );
  }, [events, todayStr]);

  // Unique categories in today's events
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>(['work', 'social', 'reminder', 'other']);
    rawTodayEvents.forEach((e) => {
      if (e.type) catSet.add(e.type.toLowerCase());
    });
    return Array.from(catSet).sort();
  }, [rawTodayEvents]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (typeFilter !== 'all') count++;
    if (minStarsFilter > 0) count++;
    if (sortBy !== 'time-asc') count++;
    return count;
  }, [searchQuery, typeFilter, minStarsFilter, sortBy]);

  // Filtered and sorted today events
  const todayApprovedEvents = useMemo(() => {
    let result = [...rawTodayEvents];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Category filter
    if (typeFilter !== 'all') {
      result = result.filter((e) => e.type && e.type.toLowerCase() === typeFilter.toLowerCase());
    }

    // Minimum stars filter
    if (minStarsFilter > 0) {
      result = result.filter((e) => (e.stars || 0) >= minStarsFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'time-asc') {
        return (a.startTime || '').localeCompare(b.startTime || '');
      }
      if (sortBy === 'time-desc') {
        return (b.startTime || '').localeCompare(a.startTime || '');
      }
      if (sortBy === 'stars-desc') {
        return (b.stars || 0) - (a.stars || 0);
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [rawTodayEvents, searchQuery, typeFilter, minStarsFilter, sortBy]);

  // Pending events for Admin view
  const pendingEvents = events.filter((e) => e.status === 'pending');

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setMinStarsFilter(0);
    setSortBy('time-asc');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Top Header Bar - follows user on scroll */}
      <div className="sticky top-14 sm:top-16 z-30 bg-slate-50/95 dark:bg-[#000000]/95 backdrop-blur-md py-2.5 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between gap-2 transition-all shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Today's Schedule
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-mono font-bold">
              {todayStr}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
            {formatReadableDate(todayStr)} • {todayApprovedEvents.length} of {rawTodayEvents.length} events
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings & View Toggle Button (Sticky) */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition shadow-xs ${
              isSettingsOpen || activeFiltersCount > 0
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                : 'bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-[#2C2C2E] hover:border-slate-300 dark:hover:border-[#3A3A3C]'
            }`}
            title="Toggle Display, View & Filter Options"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings & Filter</span>
            <span className="sm:hidden">Settings</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-white text-blue-700 dark:bg-black dark:text-blue-400 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            {isSettingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>

          {/* Jump to Today Button */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-1 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-400 px-2.5 py-1.5 rounded-xl transition"
            title="Jump to top"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Today</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE SETTINGS & FILTER PANEL FOR TODAY */}
      {isSettingsOpen && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 shadow-md space-y-4 animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2C2C2E] pb-3">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Today Schedule Controls & Filters
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Show / Hide Covers Toggle */}
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition ${
                  showThumbnails
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50'
                    : 'bg-slate-100 dark:bg-[#121214] text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-[#2C2C2E]'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                <span>{showThumbnails ? 'Hide Covers' : 'Show Covers'}</span>
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search Input */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <Search className="w-3 h-3 mr-1 text-slate-400" /> Search Today
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, location, tag..."
                className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <Filter className="w-3 h-3 mr-1 text-slate-400" /> Category
              </label>
              <CategorySelect
                value={typeFilter}
                onChange={(cat) => setTypeFilter(cat)}
                availableCategories={availableCategories}
                allowAllOption={true}
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <ArrowUpDown className="w-3 h-3 mr-1 text-slate-400" /> Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="time-asc">Time (Earliest First)</option>
                <option value="time-desc">Time (Latest First)</option>
                <option value="stars-desc">Rating (Highest Stars)</option>
                <option value="title-asc">Title (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Star Rating Slider Filter */}
          <div className="bg-slate-50 dark:bg-[#050505]/60 border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1.5" />
                Minimum Stars Filter
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minStarsFilter}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMinStarsFilter(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                  }}
                  className="w-14 bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#3A3A3C] rounded-lg px-1.5 py-0.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center focus:outline-none"
                />
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {minStarsFilter === 0 ? 'All' : `★ ${minStarsFilter}+`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={minStarsFilter}
              onChange={(e) => setMinStarsFilter(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Approved Events for Today */}
      <div className="space-y-4">
        {todayApprovedEvents.length > 0 ? (
          todayApprovedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currentUser={currentUser}
              onUpdate={onUpdateEvent}
              onDelete={onDeleteEvent}
              onDuplicate={onDuplicateEvent}
              onApprove={onApproveEvent}
              onReject={onRejectEvent}
              showThumbnail={showThumbnails}
            />
          ))
        ) : (
          <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-[#2C2C2E] flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {rawTodayEvents.length === 0
                ? 'No events published for today'
                : 'No today events match your active filters'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8E8E93] max-w-sm mx-auto">
              {rawTodayEvents.length === 0
                ? 'Your inbox is clear for today! You can propose new events or check future dates in All Events.'
                : 'Try adjusting your search query, category, or minimum star rating filters above.'}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-slate-900 dark:text-white text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <button
                onClick={onNavigateToAdd}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Propose an Event</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin Pending Review Section */}
      {isAdmin && (
        <div className="pt-6 border-t border-slate-200 dark:border-[#2C2C2E] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-500 dark:text-[#8E8E93]">
              <Shield className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-[#8E8E93]">
                Pending Review Queue ({pendingEvents.length})
              </h3>
            </div>
            {pendingEvents.length > 0 && (
              <span className="text-xs font-extrabold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800/40 uppercase tracking-wider">
                Action Required
              </span>
            )}
          </div>

          {pendingEvents.length > 0 ? (
            <div className="space-y-4">
              {pendingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUser={currentUser}
                  onUpdate={onUpdateEvent}
                  onDelete={onDeleteEvent}
                  onDuplicate={onDuplicateEvent}
                  onApprove={onApproveEvent}
                  onReject={onRejectEvent}
                  showThumbnail={showThumbnails}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 text-center text-xs text-slate-500 dark:text-[#8E8E93]">
              No pending suggestions waiting for approval.
            </div>
          )}
        </div>
      )}

      {/* Viewer's Pending Section if not admin but viewer has pending items */}
      {!isAdmin && pendingEvents.filter((e) => e.requestedBy === currentUser.email).length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-[#2C2C2E] space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-red-600 dark:text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-[#8E8E93]">
              Your Pending Suggestions ({pendingEvents.filter((e) => e.requestedBy === currentUser.email).length})
            </h3>
          </div>
          <div className="space-y-4">
            {pendingEvents
              .filter((e) => e.requestedBy === currentUser.email)
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUser={currentUser}
                  onUpdate={onUpdateEvent}
                  onDelete={onDeleteEvent}
                  onDuplicate={onDuplicateEvent}
                  showThumbnail={showThumbnails}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
