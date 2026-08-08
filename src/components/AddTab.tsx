import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Upload,
  AlertCircle,
  PlusCircle,
  Sparkles,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { EventItem, UserAuth } from '../types';
import { EXTRACTION_SKILL_PROMPT, parsePastedExtraction } from '../utils/claudePrompt';
import { parseCSVInput, getTodayDateString } from '../utils/dateUtils';

interface AddTabProps {
  currentUser: UserAuth;
  userPendingCount: number;
  onAddEvents: (events: Omit<EventItem, 'id'>[]) => Promise<void>;
  onNavigateToToday: () => void;
}

export const AddTab: React.FC<AddTabProps> = ({
  currentUser,
  userPendingCount,
  onAddEvents,
  onNavigateToToday,
}) => {
  const [mode, setMode] = useState<'csv' | 'screenshot'>('screenshot');
  const [inputText, setInputText] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const isViewer = currentUser.role === 'viewer';
  const isCapped = isViewer && userPendingCount >= 5;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(EXTRACTION_SKILL_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCapped) return;
    if (!inputText.trim()) {
      setErrorMsg('Please paste or type content before submitting.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let parsedEvents: Partial<EventItem>[] = [];

      if (mode === 'csv') {
        parsedEvents = parseCSVInput(inputText);
        if (parsedEvents.length === 0) {
          throw new Error('No valid CSV events found. Expected format: title, start, startTime, end, endTime, location, type');
        }
      } else {
        // Screenshot / AI JSON mode
        const res = parsePastedExtraction(inputText);
        if (!res.success) {
          throw new Error(res.error || 'Failed to parse JSON.');
        }
        parsedEvents = res.events;
      }

      const todayStr = getTodayDateString();
      const newEvents: Omit<EventItem, 'id'>[] = parsedEvents.map((pe) => ({
        title: pe.title || 'Untitled Event',
        type: pe.type || 'other',
        start: pe.start || todayStr,
        startTime: pe.startTime || '09:00',
        end: pe.end || pe.start || todayStr,
        endTime: pe.endTime || '10:00',
        location: pe.location || '',
        added: todayStr,
        status: isViewer ? 'pending' : 'approved',
        requestedBy: currentUser.email || 'anonymous',
        stars: pe.stars ?? 3,
      }));

      await onAddEvents(newEvents);
      setSuccessCount(newEvents.length);
      setInputText('');
      setTimeout(() => setSuccessCount(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Propose New Events</h2>
        <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-0.5">
          Submit events via CSV list or screenshot extraction with Claude AI.
        </p>
      </div>

      {/* Suggestion Cap Warning for Viewers */}
      {isCapped && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">Suggestion Limit Reached</div>
            <p className="text-slate-600 dark:text-[#8E8E93]">You have 5 pending suggestions — wait for approval or delete one before adding more.</p>
          </div>
        </div>
      )}

      {/* Mode Switcher Toggle */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl">
        <button
          onClick={() => {
            setMode('screenshot');
            setErrorMsg('');
          }}
          className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold rounded-xl transition ${
            mode === 'screenshot'
              ? 'bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Screenshot (AI) Mode</span>
        </button>
        <button
          onClick={() => {
            setMode('csv');
            setErrorMsg('');
          }}
          className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold rounded-xl transition ${
            mode === 'csv'
              ? 'bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV Mode</span>
        </button>
      </div>

      {/* Screenshot (AI) Instructions & Claude Redirect */}
      {mode === 'screenshot' && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#2C2C2E]">
            <div>
              <div className="flex items-center space-x-1.5 font-bold text-sm text-slate-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Extract Events with Claude AI</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8E8E93] mt-1">
                Upload screenshot to Claude, copy its 1-line reply back here.
              </p>
            </div>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition shadow-md shadow-blue-500/20 whitespace-nowrap"
            >
              <span>Open in Claude to extract events</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Copyable Skill Prompt Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#8E8E93] flex items-center">
                <HelpCircle className="w-3 h-3 mr-1 text-slate-400 dark:text-[#8E8E93]" />
                Skill Prompt (Paste into Claude)
              </span>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center space-x-1 text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#2C2C2E] px-2.5 py-1 rounded-lg transition"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2D9CDB]" />
                    <span className="text-emerald-600 dark:text-[#2D9CDB]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#050505] border border-slate-200 dark:border-[#2C2C2E] rounded-xl p-3 font-mono text-[11px] text-slate-800 dark:text-zinc-300 leading-relaxed overflow-x-auto max-h-36 select-all">
              {EXTRACTION_SKILL_PROMPT}
            </div>
          </div>
        </div>
      )}

      {/* CSV Mode Info */}
      {mode === 'csv' && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 text-xs text-slate-500 dark:text-[#8E8E93] space-y-2 shadow-sm">
          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center">
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" /> CSV Format Guideline
          </div>
          <p>Provide one event per line in the format:</p>
          <div className="bg-slate-50 dark:bg-[#050505] p-2.5 rounded-xl border border-slate-200 dark:border-[#2C2C2E] font-mono text-[11px] text-blue-700 dark:text-blue-400 select-all font-semibold">
            title, start, startTime, end, endTime, location, type
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
            Example: Tech Meetup, 2026-08-03, 18:00, 2026-08-03, 20:00, Innovation Lab, social
          </p>
        </div>
      )}

      {/* File Upload / Drag & Drop Helper */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl px-4 py-3 text-xs shadow-sm">
        <span className="text-slate-500 dark:text-[#8E8E93] flex items-center">
          <Upload className="w-4 h-4 mr-2 text-slate-400 dark:text-[#8E8E93]" /> Or load a .json or .csv file directly:
        </span>
        <label className="cursor-pointer text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] border border-slate-200 dark:border-[#2C2C2E] px-3 py-1.5 rounded-xl transition">
          Browse File
          <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
            {mode === 'screenshot' ? 'Paste Claude Code or Raw JSON' : 'Paste CSV Lines'}
          </label>
          <textarea
            rows={6}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder={
              mode === 'screenshot'
                ? '[{"title":"Team Lunch","type":"social","start":"2026-08-03","startTime":"12:00","end":"2026-08-03","endTime":"13:00","location":"Downtown Cafe"}]'
                : 'Team Lunch, 2026-08-03, 12:00, 2026-08-03, 13:00, Downtown Cafe, social'
            }
            className="w-full bg-white dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] hover:border-slate-400 dark:hover:border-[#3A3A3C] focus:border-blue-600 dark:focus:border-blue-500 rounded-2xl p-3.5 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition leading-relaxed shadow-sm"
          />
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-[#EB5757]/15 border border-red-200 dark:border-[#EB5757]/30 text-red-700 dark:text-[#EB5757] text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-[#EB5757] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Banner */}
        {successCount !== null && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#2D9CDB]/15 border border-emerald-200 dark:border-[#2D9CDB]/30 text-emerald-800 dark:text-[#2D9CDB] text-xs flex items-center justify-between">
            <span className="flex items-center font-bold">
              <Check className="w-4 h-4 mr-2 text-emerald-600 dark:text-[#2D9CDB]" />
              Successfully submitted {successCount} event{successCount === 1 ? '' : 's'} (
              {isViewer ? 'Pending Admin Review' : 'Published Immediately'})!
            </span>
            <button
              type="button"
              onClick={onNavigateToToday}
              className="text-xs underline font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-[#2D9CDB]"
            >
              View Schedule →
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCapped || isSubmitting || !inputText.trim()}
          className={`w-full py-3 px-4 rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 ${
            isCapped || isSubmitting || !inputText.trim()
              ? 'bg-slate-200 dark:bg-[#2C2C2E] text-slate-400 dark:text-[#8E8E93] cursor-not-allowed border border-slate-200 dark:border-[#2C2C2E]'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.99]'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>
            {isSubmitting
              ? 'Processing Events...'
              : isViewer
              ? 'Submit Suggestions for Review'
              : 'Publish Events Immediately'}
          </span>
        </button>
      </form>
    </div>
  );
};
