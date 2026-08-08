import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Database,
  Layers,
  LogIn,
  DownloadCloud,
  Settings2,
  Shield,
  Lock,
} from 'lucide-react';
import { UserAuth } from '../types';

interface DataSourcesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sheetUrl: string;
  onSheetUrlChange: (url: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  sheetTitle: string | null;
  syncedCount: number;
  firestoreCount: number;
  currentUser: UserAuth;
  onLoginWithGoogle: () => void;
  onImportSheetEventsToDb: () => void;
}

export const DataSourcesSidebar: React.FC<DataSourcesSidebarProps> = ({
  isOpen,
  onClose,
  sheetUrl,
  onSheetUrlChange,
  onSync,
  isSyncing,
  lastSyncedTime,
  sheetTitle,
  syncedCount,
  firestoreCount,
  currentUser,
  onLoginWithGoogle,
  onImportSheetEventsToDb,
}) => {
  const [importSuccess, setImportSuccess] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const handleImport = async () => {
    if (!isAdmin) return;
    await onImportSheetEventsToDb();
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[#121214] border-r border-slate-200 dark:border-[#2C2C2E] text-slate-900 dark:text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between bg-slate-50 dark:bg-[#1C1C1E]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-[#2D9CDB]/15 border border-blue-200 dark:border-[#2D9CDB]/30 flex items-center justify-center text-blue-700 dark:text-[#2D9CDB]">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Data Sources & Sync</h2>
              <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">Google Sheet & Database Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] text-slate-500 dark:text-[#8E8E93] hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Synchronized Status Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl space-y-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Automatic Data Synchronization
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8E8E93] leading-relaxed">
              All events from live database and Google Sheets are automatically merged into your unified calendar view.
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#2C2C2E] grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-white dark:bg-[#050505] rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
                <div className="text-[10px] text-slate-500 dark:text-[#8E8E93] uppercase font-bold">Firestore DB</div>
                <div className="text-sm font-bold text-blue-700 dark:text-[#2D9CDB]">{firestoreCount} events</div>
              </div>
              <div className="p-2 bg-white dark:bg-[#050505] rounded-xl border border-slate-200 dark:border-[#2C2C2E]">
                <div className="text-[10px] text-slate-500 dark:text-[#8E8E93] uppercase font-bold">Google Sheet</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-[#27AE60]">{syncedCount} events</div>
              </div>
            </div>
          </div>

          {/* Google Sheets Integration Card */}
          <div className="bg-slate-50 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl p-4 space-y-4 shadow-sm relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-[#27AE60]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Google Sheets Integration
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                isAdmin
                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                  : 'bg-slate-200 dark:bg-[#8E8E93]/20 text-slate-600 dark:text-[#8E8E93] border border-slate-300 dark:border-[#2C2C2E]'
              }`}>
                {isAdmin ? <Shield className="w-3 h-3 mr-0.5" /> : <Lock className="w-3 h-3 mr-0.5" />}
                {isAdmin ? 'Admin Only Control' : 'Admin Restricted'}
              </span>
            </div>

            {isAdmin ? (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-[#8E8E93] block">
                    Spreadsheet URL or ID
                  </label>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => onSheetUrlChange(e.target.value)}
                    placeholder="Paste Google Sheet URL..."
                    className="w-full bg-white dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] hover:border-slate-400 dark:hover:border-[#3A3A3C] focus:border-emerald-600 dark:focus:border-[#27AE60] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition font-mono"
                  />
                  <button
                    onClick={onSync}
                    disabled={isSyncing || !sheetUrl.trim()}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm ${
                      isSyncing || !sheetUrl.trim()
                        ? 'bg-slate-200 dark:bg-[#2C2C2E] text-slate-400 dark:text-[#8E8E93] cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing Sheet...' : 'Sync Sheet Data'}</span>
                  </button>
                </div>

                {/* Sync Status Banner */}
                <div className="p-3 bg-white dark:bg-[#050505] rounded-xl border border-slate-200 dark:border-[#2C2C2E] text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="truncate">{sheetTitle || 'Google Sheet'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#27AE60]/15 text-emerald-800 dark:text-[#27AE60] font-bold">
                      {syncedCount} items
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
                    {lastSyncedTime ? `Last synced at ${lastSyncedTime}` : 'Not synced yet'}
                  </p>
                </div>

                {/* Import Button */}
                {syncedCount > 0 && (
                  <button
                    onClick={handleImport}
                    className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-[#2D9CDB]/15 dark:hover:bg-[#2D9CDB]/25 border border-blue-200 dark:border-[#2D9CDB]/40 text-blue-800 dark:text-[#2D9CDB] font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Import {syncedCount} Events to Firestore DB</span>
                  </button>
                )}

                {importSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-[#27AE60]/15 border border-emerald-200 dark:border-[#27AE60]/30 text-emerald-800 dark:text-[#27AE60] text-xs flex items-center font-bold">
                    <Check className="w-4 h-4 mr-2 text-emerald-600 dark:text-[#27AE60]" />
                    Events successfully imported to Firestore!
                  </div>
                )}
              </>
            ) : (
              /* Viewer Notice */
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#050505] border border-slate-200 dark:border-[#2C2C2E] text-xs space-y-2">
                <div className="flex items-center text-slate-600 dark:text-[#8E8E93] space-x-1.5 font-bold">
                  <Lock className="w-4 h-4 text-red-600 dark:text-red-500" />
                  <span>Google Sheet settings are managed by Admins.</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#8E8E93] leading-relaxed">
                  As a Viewer, you can view events from the active Google Sheet in your calendar, but only Admins can sync or update the Google Sheet connection.
                </p>
                {syncedCount > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-zinc-300">Connected Sheet:</span>
                    <span className="text-emerald-700 dark:text-[#27AE60] font-bold">{syncedCount} items synced</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Google Auth Notice for Private Sheets */}
          {isAdmin && !currentUser.googleAccessToken && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-xs space-y-2.5">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  Private Google Sheets require Google sign-in permission. Sign in below to read private sheets.
                </p>
              </div>
              <button
                onClick={onLoginWithGoogle}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#2C2C2E] bg-slate-50 dark:bg-[#1C1C1E] text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-200 dark:bg-[#2C2C2E] hover:bg-slate-300 dark:hover:bg-[#3A3A3C] text-xs font-bold text-slate-800 dark:text-zinc-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

