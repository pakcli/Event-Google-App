import React, { useState } from 'react';
import {
  Calendar,
  Shield,
  User as UserIcon,
  LogIn,
  LogOut,
  CheckCircle2,
  Sliders,
  ChevronDown,
  Layers,
  PanelLeftOpen,
  Sun,
  Moon,
  Siren,
  Sparkles,
} from 'lucide-react';
import { UserAuth, UserRole } from '../types';
import { loginWithGoogle, logoutUser, saveUserRole } from '../lib/firebase';

interface HeaderProps {
  currentUser: UserAuth;
  onUserChange: (user: UserAuth) => void;
  allEventsCount: number;
  pendingCount: number;
  onOpenDataSourcesSidebar?: () => void;
  onNavigateToPending?: () => void;
  onOpenAIChat?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  allEventsCount,
  pendingCount,
  onOpenDataSourcesSidebar,
  onNavigateToPending,
  onOpenAIChat,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [roleToGrant, setRoleToGrant] = useState<UserRole>('admin');
  const [grantSuccessMsg, setGrantSuccessMsg] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const authUser = await loginWithGoogle();
      onUserChange(authUser);
    } catch (err: any) {
      alert(`Sign in note: Google popup window might be restricted in iFrame. Quick switch is also available in the top menu.`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onUserChange({
      email: 'viewer.demo@example.com',
      displayName: 'Demo Viewer',
      uid: 'viewer-demo',
      role: 'viewer',
      isGuest: true,
    });
  };

  const togglePersonaRole = async (newRole: UserRole) => {
    const updated: UserAuth = {
      ...currentUser,
      role: newRole,
      email: currentUser.email || (newRole === 'admin' ? 'dcalibri@gmail.com' : 'viewer.demo@example.com'),
      displayName: currentUser.displayName || (newRole === 'admin' ? 'Admin User' : 'Viewer User'),
    };
    onUserChange(updated);
    if (updated.email) {
      try {
        await saveUserRole(updated.email, newRole);
      } catch (e) {
        // ignore offline fallback
      }
    }
  };

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    try {
      await saveUserRole(customEmail.trim(), roleToGrant);
      setGrantSuccessMsg(`Role '${roleToGrant}' granted to ${customEmail}`);
      setCustomEmail('');
      setTimeout(() => setGrantSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Error updating role: ' + err.message);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b-2 border-blue-600 dark:border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm transition-colors duration-200">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Left Side: Data Sources Sidebar Toggle & Brand */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {onOpenDataSourcesSidebar && (
            <button
              onClick={onOpenDataSourcesSidebar}
              className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1C1C1E] dark:hover:bg-[#2C2C2E] border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-500/50 rounded-xl text-xs font-semibold text-slate-800 dark:text-white transition shadow-sm group shrink-0"
              title="Open Data Sources & Sync Settings"
            >
              <PanelLeftOpen className="w-4 h-4 text-blue-600 dark:text-[#2D9CDB] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline ml-1.5">Data Sources</span>
            </button>
          )}

          <div className="flex items-center space-x-2 shrink-0">
            <div className="shrink-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1 whitespace-nowrap">
                  <span>Event Inbox</span>
                </h1>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 shrink-0">
                  Shared
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-500 dark:text-[#8E8E93]">One clear calendar • Direct Google export</p>
            </div>
          </div>
        </div>

        {/* User Account & Theme Toggle Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* AI Assistant Chat Trigger Button */}
          {onOpenAIChat && (
            <button
              onClick={onOpenAIChat}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-sm shadow-blue-500/20 group shrink-0"
              title="Open AI Schedule Chat Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">AI Chat</span>
            </button>
          )}

          {/* Pending Review Quick Navigation Button */}
          {pendingCount > 0 && onNavigateToPending && (
            <button
              onClick={onNavigateToPending}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition shadow-xs group shrink-0"
              title="Open Pending Review Queue"
            >
              <Siren className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Pending Review</span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                {pendingCount}
              </span>
            </button>
          )}

          {/* Theme Switcher Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl border transition shadow-sm font-semibold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
              title={`Switch to ${theme === 'light' ? 'Dark Mode' : 'Light Mode'}`}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-blue-700" />
                  <span className="hidden md:inline ml-1.5 text-blue-900 font-bold">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline ml-1.5 text-amber-300 font-bold">Light</span>
                </>
              )}
            </button>
          )}

          {/* Main Google Auth Button or Account Badge */}
          {currentUser.isGuest ? (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-blue-700 shadow-sm transition text-xs"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1.5 bg-slate-100 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-500/50 rounded-xl px-2 py-1.5 sm:px-3 sm:py-1.5 transition text-xs"
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <span
                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                      : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                  }`}
                >
                  {currentUser.role === 'admin' ? (
                    <>
                      <Shield className="w-3 h-3 mr-0.5" /> Admin
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-3 h-3 mr-0.5" /> Viewer
                    </>
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-[#8E8E93]" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl shadow-2xl p-3 text-xs z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="pb-2 mb-2 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center space-x-2">
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <div>
                      <div className="text-slate-500 dark:text-[#8E8E93] text-[10px] uppercase tracking-wider font-semibold">Google Account</div>
                      <div className="text-slate-900 dark:text-white font-semibold truncate">{currentUser.email}</div>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="text-slate-500 dark:text-[#8E8E93] text-[10px] uppercase font-semibold tracking-wider mb-1">Role Settings</div>
                    <button
                      onClick={() => {
                        togglePersonaRole('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentUser.role === 'admin' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2C2C2E]'
                      }`}
                    >
                      <span className="flex items-center">
                        <Shield className="w-3.5 h-3.5 mr-2 text-red-600 dark:text-red-400" /> Admin Role
                      </span>
                      {currentUser.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                    </button>
                    <button
                      onClick={() => {
                        togglePersonaRole('viewer');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentUser.role === 'viewer' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2C2C2E]'
                      }`}
                    >
                      <span className="flex items-center">
                        <UserIcon className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-blue-400" /> Viewer Role
                      </span>
                      {currentUser.role === 'viewer' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </button>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsRoleModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] flex items-center border-t border-slate-200 dark:border-[#2C2C2E] mt-2 pt-2"
                    >
                      <Sliders className="w-3.5 h-3.5 mr-2 text-slate-500 dark:text-[#8E8E93]" /> Manage Admin Roles
                    </button>
                  )}

                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between">
                    <button
                      onClick={handleLogout}
                      className="text-red-600 dark:text-[#EB5757] hover:text-red-700 flex items-center text-[11px] font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Manager Modal for Admin */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E] rounded-2xl w-full max-w-md p-5 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2C2C2E]">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-500" />
                <h3 className="font-bold text-base">Manage Roles & Permissions</h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-[#8E8E93] dark:hover:text-white text-sm p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2C2C2E]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#8E8E93] leading-relaxed">
              Grant Admin or Viewer permissions to specific email addresses. Roles are persisted securely in your Firestore database.
            </p>

            <form onSubmit={handleGrantRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">User Email Address</label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="e.g. colleague@example.com"
                  className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Assign Role</label>
                <select
                  value={roleToGrant}
                  onChange={(e) => setRoleToGrant(e.target.value as UserRole)}
                  className="w-full bg-slate-50 dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                >
                  <option value="admin">Admin (Can publish & manage all events)</option>
                  <option value="viewer">Viewer (Can request events with 5-cap)</option>
                </select>
              </div>

              {grantSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  {grantSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-white text-xs font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold text-xs shadow-md"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

