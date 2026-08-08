import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Copy,
  Trash2,
  Check,
  X,
  ExternalLink,
  MapPin,
  Clock,
  Briefcase,
  Users,
  Bell,
  Tag,
  Save,
  User,
  Star,
} from 'lucide-react';
import { EventItem, EventType, UserAuth } from '../types';
import { generateGoogleCalendarUrl, formatReadableDate, formatTime12h } from '../utils/dateUtils';
import { getCategoryStyle } from '../utils/categoryUtils';
import { CategorySelect } from './CategorySelect';

interface EventCardProps {
  event: EventItem;
  currentUser: UserAuth;
  onUpdate: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (event: EventItem) => Promise<void>;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  showThumbnail?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentUser,
  onUpdate,
  onDelete,
  onDuplicate,
  onApprove,
  onReject,
  showThumbnail = false,
}) => {
  // Local state for editable fields
  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState<EventType>(event.type);
  const [start, setStart] = useState(event.start);
  const [startTime, setStartTime] = useState(event.startTime);
  const [end, setEnd] = useState(event.end);
  const [endTime, setEndTime] = useState(event.endTime);
  const [location, setLocation] = useState(event.location);
  const [tagsText, setTagsText] = useState((event.tags || []).join(', '));
  const [stars, setStars] = useState(event.stars || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync internal state if prop updates
  useEffect(() => {
    setTitle(event.title);
    setType(event.type);
    setStart(event.start);
    setStartTime(event.startTime);
    setEnd(event.end);
    setEndTime(event.endTime);
    setLocation(event.location);
    setTagsText((event.tags || []).join(', '));
    setStars(event.stars || 0);
    setHasUnsavedChanges(false);
  }, [event]);

  const isAdmin = currentUser.role === 'admin';
  const isOwnPending =
    currentUser.role === 'viewer' &&
    event.status === 'pending' &&
    currentUser.email &&
    event.requestedBy?.toLowerCase() === currentUser.email.toLowerCase();

  const canEdit = isAdmin || isOwnPending;

  // Handle field change and auto mark unsaved
  const handleFieldChange = (fieldSetter: (val: any) => void, value: any) => {
    fieldSetter(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedTags = tagsText
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      await onUpdate(event.id, {
        title,
        type,
        start,
        startTime,
        end,
        endTime,
        location,
        tags: parsedTags,
        stars,
      });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      alert('Error saving changes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute live Google Calendar URL based on CURRENT field values
  const currentLiveEvent: EventItem = {
    ...event,
    title,
    type,
    start,
    startTime,
    end,
    endTime,
    location,
  };

  const gCalUrl = generateGoogleCalendarUrl(currentLiveEvent);

  const currentTypeStyle = getCategoryStyle(type);
  const thumbnailUrl = event.imageUrl || currentTypeStyle.defaultImg;

  // Active tags to show
  const activeTags = event.tags && event.tags.length > 0 ? event.tags : [type];

  return (
    <div
      className={`relative bg-white dark:bg-[#1C1C1E] border rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md ${
        event.status === 'pending'
          ? 'border-red-500/80 bg-red-50/40 dark:bg-[#1C1C1E] ring-2 ring-red-500/20'
          : 'border-slate-200 dark:border-[#2C2C2E] hover:border-blue-400 dark:hover:border-[#3A3A3C]'
      }`}
    >
      {/* Optional Thumbnail Banner */}
      {showThumbnail && (
        <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
            <span className="text-xs font-bold drop-shadow-md truncate">{title}</span>
            <span className="text-[10px] font-mono bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
              {type.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Top Header Row: Type Dropdown & Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {canEdit ? (
              <CategorySelect
                value={type}
                onChange={(newCat) => handleFieldChange(setType, newCat)}
              />
            ) : (
              <span
                className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-xl border uppercase tracking-wider ${currentTypeStyle.bg}`}
              >
                {currentTypeStyle.icon}
                {type}
              </span>
            )}

            {/* Tag Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {activeTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#2C2C2E] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-[#3A3A3C]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {event.status === 'pending' && (
              <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm uppercase tracking-wider animate-pulse">
                Review Required
              </span>
            )}

            {event.source === 'google_sheet' && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#27AE60]/15 text-emerald-800 dark:text-[#27AE60] border border-emerald-200 dark:border-[#27AE60]/30 uppercase tracking-wider">
                Google Sheet
              </span>
            )}
          </div>

          {/* Requested By email if pending */}
          {event.requestedBy && (
            <span
              className="text-[11px] text-slate-500 dark:text-[#8E8E93] truncate max-w-[140px] flex items-center shrink-0"
              title={`Submitted by ${event.requestedBy}`}
            >
              <User className="w-3 h-3 mr-1 text-slate-400 dark:text-[#8E8E93]" />
              {event.requestedBy.split('@')[0]}
            </span>
          )}
        </div>

        {/* Title & Star Rating Field */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {canEdit ? (
              <input
                type="text"
                value={title}
                onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                placeholder="Event Title..."
                className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] hover:border-slate-400 dark:hover:border-[#3A3A3C] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl px-3 py-1.5 text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition"
              />
            ) : (
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
          </div>

          {/* Star Rating display/interactive picker */}
          <div className="shrink-0 flex items-center">
            {canEdit ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 bg-slate-50 dark:bg-[#050505] p-1.5 rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
                <div className="flex items-center space-x-1 shrink-0">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#8E8E93]">Stars:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stars}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const clamped = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                      handleFieldChange(setStars, clamped);
                    }}
                    className="w-14 bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#3A3A3C] rounded-lg px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-center"
                    title="Type star count (0-100)"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500">/100</span>
                </div>

                {/* Quick Pick Presets: 1, 2, 3, 4, 5, 10, 20, 30, 50, 100 */}
                <div className="flex items-center flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFieldChange(setStars, preset)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md transition ${
                        stars === preset
                          ? 'bg-amber-400 text-black shadow-xs'
                          : 'bg-slate-200/80 dark:bg-[#2C2C2E] text-slate-700 dark:text-zinc-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 rounded-xl">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300">
                  {stars} {stars === 1 ? 'star' : 'stars'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tag Editing Input (if canEdit) */}
        {canEdit && (
          <div className="flex items-center space-x-1.5 text-xs">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-[#8E8E93] shrink-0" />
            <input
              type="text"
              value={tagsText}
              onChange={(e) => handleFieldChange(setTagsText, e.target.value)}
              placeholder="Tags (comma separated, e.g. urgent, meeting, team)..."
              className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Date & Time Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Start */}
          <div className="bg-slate-50 dark:bg-[#050505]/60 border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-2.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" /> Start
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => handleFieldChange(setStart, e.target.value)}
                  className="bg-white dark:bg-[#121214] border border-slate-300 dark:border-[#2C2C2E] rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 flex-1 min-w-[120px]"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleFieldChange(setStartTime, e.target.value)}
                  className="bg-white dark:bg-[#121214] border border-slate-300 dark:border-[#2C2C2E] rounded-lg px-1.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 w-auto min-w-[80px]"
                />
              </div>
            ) : (
              <div className="text-slate-800 dark:text-zinc-200 font-semibold text-xs sm:text-sm">
                {formatReadableDate(start)} @ {formatTime12h(startTime)}
              </div>
            )}
          </div>

          {/* End */}
          <div className="bg-slate-50 dark:bg-[#050505]/60 border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-2.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-[#8E8E93] mb-1 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" /> End
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={end}
                  onChange={(e) => handleFieldChange(setEnd, e.target.value)}
                  className="bg-white dark:bg-[#121214] border border-slate-300 dark:border-[#2C2C2E] rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 flex-1 min-w-[120px]"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleFieldChange(setEndTime, e.target.value)}
                  className="bg-white dark:bg-[#121214] border border-slate-300 dark:border-[#2C2C2E] rounded-lg px-1.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 w-auto min-w-[80px]"
                />
              </div>
            ) : (
              <div className="text-slate-800 dark:text-zinc-200 font-semibold text-xs sm:text-sm">
                {formatReadableDate(end)} @ {formatTime12h(endTime)}
              </div>
            )}
          </div>
        </div>

        {/* Location & Added Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="sm:col-span-2">
            {canEdit ? (
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-[#8E8E93]" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => handleFieldChange(setLocation, e.target.value)}
                  placeholder="Location (e.g., Room 102 or Zoom)..."
                  className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] hover:border-slate-400 dark:hover:border-[#3A3A3C] focus:border-blue-600 dark:focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center text-slate-600 dark:text-[#8E8E93] text-xs py-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 dark:text-[#8E8E93] flex-shrink-0" />
                <span className="truncate">{location || 'No location specified'}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-start sm:justify-end text-[11px] text-slate-400 dark:text-[#8E8E93] font-mono">
            Added {event.added}
          </div>
        </div>

        {/* Unsaved changes alert button */}
        {canEdit && hasUnsavedChanges && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              Unsaved edits
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-[#2C2C2E] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Left Side: Add to Google Calendar button */}
          <a
            href={gCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 px-3.5 py-2 rounded-xl transition shadow-md shadow-blue-500/20 w-full sm:w-auto"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
            Add to Calendar
            <ExternalLink className="w-3 h-3 ml-1.5 opacity-80" />
          </a>

          {/* Right Side: Duplicate / Admin Approve / Reject / Delete buttons */}
          <div className="flex items-center justify-end space-x-1.5 w-full sm:w-auto">
            {/* Admin Approve & Reject buttons on Pending Events */}
            {isAdmin && event.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove && onApprove(event.id)}
                  className="inline-flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl transition shadow-sm"
                  title="Approve & Publish Event"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </button>
                <button
                  onClick={() => onReject && onReject(event.id)}
                  className="inline-flex items-center text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-2 rounded-xl transition shadow-sm"
                  title="Reject Event"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </button>
              </>
            )}

            {/* Duplicate button */}
            <button
              onClick={() => onDuplicate(event)}
              className="inline-flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] border border-slate-200 dark:border-[#2C2C2E] px-2.5 py-2 rounded-xl transition shadow-sm flex-1 sm:flex-initial"
              title="Clone into new submission"
            >
              <Copy className="w-3.5 h-3.5 mr-1 text-slate-500 dark:text-[#8E8E93]" /> Duplicate
            </button>

            {/* Delete button (Admin on all cards, or Viewer on own pending) */}
            {(isAdmin || isOwnPending) && (
              <button
                onClick={() => onDelete(event.id)}
                className="inline-flex items-center justify-center text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl transition shrink-0"
                title={isOwnPending ? 'Withdraw my pending suggestion' : 'Delete Event'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
