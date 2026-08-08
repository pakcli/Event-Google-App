import React, { useState, useMemo } from 'react';
import {
  List,
  Calendar as CalendarIcon,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  ArrowUpDown,
  Tag,
  Image,
  Sun,
  Moon,
  SlidersHorizontal,
  Columns,
  Star,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { EventItem, EventType, UserAuth } from '../types';
import {
  formatReadableDate,
  formatTime12h,
  exportEventsToCSV,
  exportEventsToJSON,
  downloadFile,
  getTodayDateString,
  isEventOnDate,
} from '../utils/dateUtils';
import { CategorySelect } from './CategorySelect';
import { EventCard } from './EventCard';

export type SortOption =
  | 'date-asc'
  | 'date-desc'
  | 'title-asc'
  | 'title-desc'
  | 'stars-desc';

interface AllEventsTabProps {
  events: EventItem[];
  currentUser: UserAuth;
  onUpdateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDuplicateEvent: (event: EventItem) => Promise<void>;
  onApproveEvent?: (id: string) => Promise<void>;
  onRejectEvent?: (id: string) => Promise<void>;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AllEventsTab: React.FC<AllEventsTabProps> = ({
  events,
  currentUser,
  onUpdateEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onApproveEvent,
  onRejectEvent,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('list');
  const [isFilterTopbarOpen, setIsFilterTopbarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [minStarsFilter, setMinStarsFilter] = useState<number>(0);
  const [sortOption, setSortOption] = useState<SortOption>('date-asc');
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'approved' | 'all'>('approved');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Month Calendar Navigation State
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Week Calendar Navigation State
  const [weekAnchorDate, setWeekAnchorDate] = useState<Date>(new Date());

  const isAdmin = currentUser.role === 'admin';

  // Extract all unique tags across events
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    events.forEach((e) => {
      if (e.tags) {
        e.tags.forEach((t) => tagSet.add(t.toLowerCase()));
      }
    });
    return Array.from(tagSet).sort();
  }, [events]);

  // Extract all unique categories across events
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>(['work', 'social', 'reminder', 'other']);
    events.forEach((e) => {
      if (e.type) catSet.add(e.type.toLowerCase());
    });
    return Array.from(catSet).sort();
  }, [events]);

  // Active filters count badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (typeFilter !== 'all') count++;
    if (tagFilter !== 'all') count++;
    if (minStarsFilter > 0) count++;
    if (selectedDate) count++;
    return count;
  }, [searchTerm, typeFilter, tagFilter, minStarsFilter, selectedDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setTagFilter('all');
    setMinStarsFilter(0);
    setSelectedDate(null);
    setSortOption('date-asc');
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Role filter: viewers only see approved OR their own pending events
      if (!isAdmin && e.status !== 'approved' && e.requestedBy !== currentUser.email) {
        return false;
      }

      // Status filter
      if (statusFilter === 'approved' && e.status !== 'approved' && !isAdmin) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && e.type !== typeFilter) {
        return false;
      }

      // Tag filter
      if (tagFilter !== 'all') {
        const eventTags = (e.tags || []).map((t) => t.toLowerCase());
        if (!eventTags.includes(tagFilter.toLowerCase()) && e.type !== tagFilter) {
          return false;
        }
      }

      // Min Star Rating filter
      if (minStarsFilter > 0 && (e.stars || 0) < minStarsFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(term);
        const matchesLoc = e.location.toLowerCase().includes(term);
        const matchesTag = (e.tags || []).some((t) => t.toLowerCase().includes(term));
        if (!matchesTitle && !matchesLoc && !matchesTag) return false;
      }

      // Selected date filter from calendar click
      if (selectedDate) {
        if (!isEventOnDate(e, selectedDate)) return false;
      }

      return true;
    });
  }, [
    events,
    currentUser,
    isAdmin,
    statusFilter,
    typeFilter,
    tagFilter,
    minStarsFilter,
    searchTerm,
    selectedDate,
  ]);

  // Sorted Events
  const sortedEvents = useMemo(() => {
    const copy = [...filteredEvents];
    copy.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return a.start.localeCompare(b.start) || a.startTime.localeCompare(b.startTime);
        case 'date-desc':
          return b.start.localeCompare(a.start) || b.startTime.localeCompare(a.startTime);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'stars-desc':
          return (b.stars || 0) - (a.stars || 0);
        default:
          return 0;
      }
    });
    return copy;
  }, [filteredEvents, sortOption]);

  // Group events by start date for List View
  const groupedEvents = useMemo(() => {
    const groups: { [date: string]: EventItem[] } = {};

    for (const e of sortedEvents) {
      if (!groups[e.start]) {
        groups[e.start] = [];
      }
      groups[e.start].push(e);
    }
    return groups;
  }, [sortedEvents]);

  // Calculate 7 days of the week for Week View
  const weekDays = useMemo(() => {
    const anchor = new Date(weekAnchorDate);
    const dayOfWeek = anchor.getDay(); // 0 = Sun
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - dayOfWeek);

    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      monthName: string;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const isToday = dateStr === getTodayDateString();
      days.push({ dateStr, dayName, dayNum, monthName, isToday });
    }
    return days;
  }, [weekAnchorDate]);

  // Week navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(weekAnchorDate);
    prev.setDate(prev.getDate() - 7);
    setWeekAnchorDate(prev);
  };
  const handleNextWeek = () => {
    const next = new Date(weekAnchorDate);
    next.setDate(next.getDate() + 7);
    setWeekAnchorDate(next);
  };
  const handleThisWeek = () => {
    setWeekAnchorDate(new Date());
  };

  // Calendar Grid calculation for Month View
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill grid to 35 or 42
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  // Event dots mapping for calendar grid
  const eventsPerDate = useMemo(() => {
    const map: Record<string, EventType[]> = {};
    for (const e of events) {
      if (e.status !== 'approved' && !isAdmin) continue;
      // Mark for start date
      if (!map[e.start]) map[e.start] = [];
      map[e.start].push(e.type);
    }
    return map;
  }, [events, isAdmin]);

  // Export handlers
  const handleCopyJSON = () => {
    const jsonStr = exportEventsToJSON(filteredEvents);
    navigator.clipboard.writeText(jsonStr);
    setCopyFeedback('JSON Copied!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyCSV = () => {
    const csvStr = exportEventsToCSV(filteredEvents);
    navigator.clipboard.writeText(csvStr);
    setCopyFeedback('CSV Copied!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportEventsToJSON(filteredEvents);
    downloadFile(jsonStr, `event-inbox-${getTodayDateString()}.json`, 'application/json');
  };

  const handleDownloadCSV = () => {
    const csvStr = exportEventsToCSV(filteredEvents);
    downloadFile(csvStr, `event-inbox-${getTodayDateString()}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Clean Header (Sticky) */}
      <div className="sticky top-14 sm:top-16 z-30 bg-slate-50/95 dark:bg-[#000000]/95 backdrop-blur-md py-2.5 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between gap-3 transition-all shadow-xs">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>All Events Calendar</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
            {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'} visible
            {selectedDate && ` • Filtered to ${selectedDate}`}
            {minStarsFilter > 0 && ` • Rated ★ ${minStarsFilter}+`}
          </p>
        </div>

        {/* Single Clean Settings & Options Toggle Button */}
        <button
          onClick={() => setIsFilterTopbarOpen(!isFilterTopbarOpen)}
          className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition shadow-xs ${
            isFilterTopbarOpen || activeFiltersCount > 0
              ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
              : 'bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-[#2C2C2E] hover:border-slate-300 dark:hover:border-[#3A3A3C]'
          }`}
          title="Toggle Display, View & Filter Options"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings & View</span>
          <span className="sm:hidden">Settings</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-white text-blue-700 dark:bg-black dark:text-blue-400 rounded-full">
              {activeFiltersCount}
            </span>
          )}
          {isFilterTopbarOpen ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-80" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          )}
        </button>
      </div>

      {/* COLLAPSIBLE / TOGGLEABLE SETTINGS & FILTER PANEL */}
      {isFilterTopbarOpen && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 shadow-md space-y-4 animate-in fade-in slide-in-from-top-3">
          {/* Section 1: View Modes & Quick Settings */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#2C2C2E] pb-3">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Display & View Settings
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle: Agenda / Week / Month */}
              <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-[#2C2C2E] rounded-xl">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Agenda</span>
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Week</span>
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    viewMode === 'month'
                      ? 'bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Month</span>
                </button>
              </div>

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

              {/* Theme Toggle Button */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-[#2C2C2E] text-slate-700 dark:text-zinc-200 hover:text-blue-600 transition"
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                </button>
              )}

              {/* Export Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center space-x-1 bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Export</span>
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#8E8E93] px-2 py-1 tracking-wider">
                      Copy to Clipboard
                    </div>
                    <button
                      onClick={handleCopyJSON}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <Copy className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-[#8E8E93]" /> Copy JSON
                      </span>
                      {copyFeedback === 'JSON Copied!' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2D9CDB]" />}
                    </button>
                    <button
                      onClick={handleCopyCSV}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <Copy className="w-3.5 h-3.5 mr-2 text-slate-400 dark:text-[#8E8E93]" /> Copy CSV
                      </span>
                      {copyFeedback === 'CSV Copied!' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2D9CDB]" />}
                    </button>

                    <div className="border-t border-slate-200 dark:border-[#2C2C2E] my-1"></div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#8E8E93] px-2 py-1 tracking-wider">
                      Download File
                    </div>
                    <button
                      onClick={handleDownloadJSON}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] flex items-center"
                    >
                      <FileJson className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-blue-400" /> Download .json
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] flex items-center"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-[#2D9CDB]" /> Download .csv
                    </button>
                  </div>
                )}
              </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Keyword Search */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1">
                Keyword Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-[#8E8E93]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, location, tag..."
                  className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <Filter className="w-3 h-3 mr-1 text-slate-400" /> Event Category
              </label>
              <CategorySelect
                value={typeFilter}
                onChange={(cat) => setTypeFilter(cat)}
                availableCategories={availableCategories}
                allowAllOption={true}
                className="w-full"
              />
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <Tag className="w-3 h-3 mr-1 text-slate-400" /> Tag Filter
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
                <ArrowUpDown className="w-3 h-3 mr-1 text-blue-500" /> Sort Order
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="date-asc">Date: Earliest First</option>
                <option value="date-desc">Date: Latest First</option>
                <option value="title-asc">Title: A to Z</option>
                <option value="title-desc">Title: Z to A</option>
                <option value="stars-desc">Highest Star Rating</option>
              </select>
            </div>
          </div>

          {/* STAR RATING RANGE SLIDER & TYPEABLE FILTER */}
          <div className="bg-slate-50 dark:bg-[#050505]/60 border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-3 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1.5" />
                Minimum Star Rating Filter (0 - 100 Stars)
              </span>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Min:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minStarsFilter}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMinStarsFilter(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                  }}
                  className="w-16 bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#3A3A3C] rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {minStarsFilter === 0 ? 'Any' : `★ ${minStarsFilter}+`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={minStarsFilter}
                onChange={(e) => setMinStarsFilter(Number(e.target.value))}
                className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-[#2C2C2E] rounded-lg"
              />
            </div>

            {/* Quick Pick Presets */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 mr-1">
                Quick Filter Presets:
              </span>
              {[0, 1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinStarsFilter(preset)}
                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-lg transition ${
                    minStarsFilter === preset
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-200/80 dark:bg-[#2C2C2E] text-slate-700 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                >
                  {preset === 0 ? 'All' : `★${preset}+`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Clear Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-2xl px-3.5 py-2 text-xs text-blue-800 dark:text-blue-300 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[11px] uppercase tracking-wider">Active Filters:</span>
            {selectedDate && (
              <span className="bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md font-mono">
                Date: {selectedDate}
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md uppercase font-bold">
                Type: {typeFilter}
              </span>
            )}
            {tagFilter !== 'all' && (
              <span className="bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md font-semibold">
                Tag: #{tagFilter}
              </span>
            )}
            {minStarsFilter > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md font-bold">
                ★ {minStarsFilter}+ Stars
              </span>
            )}
            {searchTerm.trim() && (
              <span className="bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md italic">
                "{searchTerm}"
              </span>
            )}
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline shrink-0"
          >
            Clear All ✕
          </button>
        </div>
      )}

      {/* WEEK VIEW CALENDAR */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-4">
          {/* Week Calendar Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2C2C2E] gap-2">
            <div className="flex items-center space-x-2">
              <Columns className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Week View: {weekDays[0].monthName} {weekDays[0].dayNum} – {weekDays[6].monthName}{' '}
                {weekDays[6].dayNum}
              </h3>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white transition"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleThisWeek}
                className="px-3 py-1 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40 hover:bg-blue-100"
              >
                This Week
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white transition"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7 Day Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {weekDays.map(({ dateStr, dayName, dayNum, monthName, isToday }) => {
              const dayEvents = sortedEvents.filter((e) => isEventOnDate(e, dateStr));
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dateStr}
                  className={`border rounded-2xl p-2.5 flex flex-col space-y-2 transition ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                      : isToday
                      ? 'bg-slate-50 dark:bg-[#2C2C2E]/60 border-blue-400 dark:border-blue-500'
                      : 'bg-slate-50/40 dark:bg-[#050505]/40 border-slate-200 dark:border-[#2C2C2E]'
                  }`}
                >
                  {/* Column Header */}
                  <button
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className="w-full text-center pb-2 border-b border-slate-200 dark:border-[#2C2C2E] hover:opacity-80 focus:outline-none"
                  >
                    <div
                      className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                        isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-[#8E8E93]'
                      }`}
                    >
                      {dayName}
                    </div>
                    <div className="flex items-center justify-center space-x-1 mt-0.5">
                      <span
                        className={`text-sm font-extrabold ${
                          isToday
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {dayNum}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-[#8E8E93]">
                        {monthName}
                      </span>
                    </div>
                  </button>

                  {/* Events for this day */}
                  <div className="space-y-2 flex-1 min-h-[100px]">
                    {dayEvents.length > 0 ? (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-2 shadow-sm text-left hover:border-blue-400 transition space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                              {formatTime12h(ev.startTime)}
                            </span>
                            {ev.stars && ev.stars > 0 ? (
                              <span className="text-[10px] font-bold text-amber-500 flex items-center">
                                ★ {ev.stars}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {ev.title}
                          </h4>
                          {ev.location && (
                            <p className="text-[10px] text-slate-500 dark:text-[#8E8E93] truncate">
                              📍 {ev.location}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400 dark:text-zinc-600 font-mono italic">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-4">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#2C2C2E]">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                }
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarMonth(new Date())}
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white"
              >
                Current
              </button>
              <button
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                }
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-[#8E8E93] uppercase tracking-widest">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ dateStr, dayNum, isCurrentMonth }) => {
              const types = eventsPerDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === getTodayDateString();

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[52px] p-1 rounded-xl border flex flex-col items-center justify-between transition relative ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/30 dark:ring-blue-500/30 font-bold'
                      : isToday
                      ? 'bg-blue-50 dark:bg-[#2C2C2E] border-blue-600 dark:border-blue-500 text-blue-900 dark:text-white font-bold'
                      : isCurrentMonth
                      ? 'bg-slate-50/60 dark:bg-[#050505]/60 border-slate-200 dark:border-[#2C2C2E] text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-[#3A3A3C]'
                      : 'bg-slate-100/30 dark:bg-[#050505]/20 border-slate-100 dark:border-zinc-900 text-slate-400 dark:text-[#8E8E93]/50'
                  }`}
                >
                  <span className={`text-xs ${isToday ? 'text-blue-700 dark:text-blue-400 font-bold' : ''}`}>{dayNum}</span>

                  {/* Event Dots */}
                  {types.length > 0 && (
                    <div className="flex items-center space-x-1 mt-1 flex-wrap justify-center max-w-full">
                      {types.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            t === 'work'
                              ? 'bg-blue-600 dark:bg-[#2D9CDB]'
                              : t === 'social'
                              ? 'bg-purple-600 dark:bg-[#BB6BD9]'
                              : t === 'reminder'
                              ? 'bg-red-600 dark:bg-red-500'
                              : 'bg-slate-400 dark:bg-[#8E8E93]'
                          }`}
                        />
                      ))}
                      {types.length > 3 && (
                        <span className="text-[9px] text-slate-400 dark:text-[#8E8E93] font-mono">+{types.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Events List View (Agenda or when in List mode) */}
      {(viewMode === 'list' || viewMode === 'week') && (
        <div className="space-y-6">
          <div className="text-xs font-bold text-slate-500 dark:text-[#8E8E93] uppercase tracking-wider mb-2">
            {viewMode === 'week' ? 'Detailed Event Cards' : 'Agenda View'}
          </div>

          {Object.keys(groupedEvents).length > 0 ? (
            Object.entries(groupedEvents).map(([dateStr, rawItems]) => {
              const items = rawItems as EventItem[];
              return (
                <div key={dateStr} className="space-y-3">
                  <div className="sticky top-14 z-20 bg-slate-50/90 dark:bg-[#050505]/90 backdrop-blur-md py-1.5 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider font-mono">
                      {formatReadableDate(dateStr)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
                      {items.length} event{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {items.map((event) => (
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
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No events found</h3>
              <p className="text-xs text-slate-500 dark:text-[#8E8E93]">
                Try adjusting your search terms, star rating slider, or filters in the Filter Settings topbar above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
