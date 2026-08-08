import React from 'react';
import {
  Briefcase,
  Users,
  Bell,
  Tag,
  Sparkles,
  Dumbbell,
  BookOpen,
  Palette,
  HeartPulse,
  DollarSign,
  Music,
  Code,
} from 'lucide-react';
import { EventType } from '../types';

export interface CategoryStyle {
  bg: string;
  badgeClass: string;
  icon: React.ReactNode;
  defaultImg: string;
}

const CUSTOM_COLOR_PALETTES = [
  {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300',
    badgeClass: 'bg-emerald-600 text-white',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300',
    badgeClass: 'bg-indigo-600 text-white',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
    badgeClass: 'bg-amber-600 text-white',
  },
  {
    bg: 'bg-pink-100 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40 text-pink-800 dark:text-pink-300',
    badgeClass: 'bg-pink-600 text-white',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40 text-cyan-800 dark:text-cyan-300',
    badgeClass: 'bg-cyan-600 text-white',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300',
    badgeClass: 'bg-rose-600 text-white',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/40 text-violet-800 dark:text-violet-300',
    badgeClass: 'bg-violet-600 text-white',
  },
];

export const getCategoryStyle = (type: EventType | string): CategoryStyle => {
  const norm = (type || 'other').toLowerCase().trim();

  switch (norm) {
    case 'work':
      return {
        bg: 'bg-blue-100 dark:bg-[#2D9CDB]/15 border-blue-200 dark:border-[#2D9CDB]/30 text-blue-800 dark:text-[#2D9CDB]',
        badgeClass: 'bg-blue-600 text-white',
        icon: <Briefcase className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      };
    case 'social':
      return {
        bg: 'bg-purple-100 dark:bg-[#BB6BD9]/15 border-purple-200 dark:border-[#BB6BD9]/30 text-purple-800 dark:text-[#BB6BD9]',
        badgeClass: 'bg-purple-600 text-white',
        icon: <Users className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
      };
    case 'reminder':
      return {
        bg: 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-400',
        badgeClass: 'bg-red-600 text-white',
        icon: <Bell className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80',
      };
    case 'other':
      return {
        bg: 'bg-slate-100 dark:bg-[#8E8E93]/15 border-slate-200 dark:border-[#8E8E93]/30 text-slate-800 dark:text-[#8E8E93]',
        badgeClass: 'bg-slate-600 text-white',
        icon: <Tag className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
      };
    case 'sports':
    case 'fitness':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300',
        badgeClass: 'bg-emerald-600 text-white',
        icon: <Dumbbell className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      };
    case 'study':
    case 'education':
      return {
        bg: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300',
        badgeClass: 'bg-indigo-600 text-white',
        icon: <BookOpen className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      };
    case 'design':
    case 'art':
      return {
        bg: 'bg-pink-100 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40 text-pink-800 dark:text-pink-300',
        badgeClass: 'bg-pink-600 text-white',
        icon: <Palette className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      };
    case 'health':
    case 'medical':
      return {
        bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300',
        badgeClass: 'bg-rose-600 text-white',
        icon: <HeartPulse className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
      };
    case 'finance':
      return {
        bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
        badgeClass: 'bg-amber-600 text-white',
        icon: <DollarSign className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      };
    case 'music':
      return {
        bg: 'bg-cyan-100 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40 text-cyan-800 dark:text-cyan-300',
        badgeClass: 'bg-cyan-600 text-white',
        icon: <Music className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      };
    case 'tech':
    case 'code':
      return {
        bg: 'bg-teal-100 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40 text-teal-800 dark:text-teal-300',
        badgeClass: 'bg-teal-600 text-white',
        icon: <Code className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      };
    default: {
      // Deterministic hash based on string
      let hash = 0;
      for (let i = 0; i < norm.length; i++) {
        hash = norm.charCodeAt(i) + ((hash << 5) - hash);
      }
      const paletteIndex = Math.abs(hash) % CUSTOM_COLOR_PALETTES.length;
      const palette = CUSTOM_COLOR_PALETTES[paletteIndex];

      return {
        bg: palette.bg,
        badgeClass: palette.badgeClass,
        icon: <Sparkles className="w-3 h-3 mr-1 shrink-0" />,
        defaultImg:
          'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
      };
    }
  }
};
