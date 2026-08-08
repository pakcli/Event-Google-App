import React from 'react';
import { Calendar, PlusCircle, List, Clock } from 'lucide-react';

export type ActiveTab = 'today' | 'add' | 'drafts' | 'pending' | 'all';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount: number;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount,
}) => {
  const isPendingActive = activeTab === 'drafts' || activeTab === 'pending';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-t-2 border-blue-600 dark:border-[#2C2C2E] py-1.5 px-2 sm:px-4 shadow-lg transition-colors duration-200">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* Tab 1: Today */}
        <button
          onClick={() => onTabChange('today')}
          className={`flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-xl transition ${
            activeTab === 'today'
              ? 'text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px] font-medium">Today</span>
        </button>

        {/* Tab 2: Add */}
        <button
          onClick={() => onTabChange('add')}
          className={`flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-xl transition ${
            activeTab === 'add'
              ? 'text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px] font-medium">Add</span>
        </button>

        {/* Tab 3: Dedicated Pending Review Button */}
        <button
          onClick={() => onTabChange('pending')}
          className={`flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-xl transition relative ${
            isPendingActive
              ? 'text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px] font-medium truncate max-w-[70px] sm:max-w-none">
            Pending
          </span>
          {pendingCount > 0 && (
            <span className="absolute top-1 sm:top-1.5 right-1.5 sm:right-3 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Tab 4: All Events */}
        <button
          onClick={() => onTabChange('all')}
          className={`flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-xl transition ${
            activeTab === 'all'
              ? 'text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-[#8E8E93] dark:hover:text-white'
          }`}
        >
          <List className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[10px] sm:text-[11px] font-medium">All Events</span>
        </button>
      </div>
    </nav>
  );
};


