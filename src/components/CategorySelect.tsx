import React, { useState } from 'react';
import { Plus, Check, Tag } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryUtils';

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  availableCategories?: string[];
  onAddNewCategory?: (newCat: string) => void;
  disabled?: boolean;
  className?: string;
  allowAllOption?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  availableCategories = [],
  onAddNewCategory,
  disabled = false,
  className = '',
  allowAllOption = false,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Built-in standard categories
  const STANDARD_CATEGORIES = ['work', 'social', 'reminder', 'other'];

  // Combine standard + custom unique categories
  const combinedCategories = Array.from(
    new Set([
      ...STANDARD_CATEGORIES,
      ...availableCategories.filter((c) => c && c !== 'all'),
    ])
  );

  const currentStyle = getCategoryStyle(value);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim().toLowerCase();
    if (!trimmed) return;

    if (onAddNewCategory) {
      onAddNewCategory(trimmed);
    }
    onChange(trimmed);
    setNewCategoryName('');
    setIsAddingNew(false);
  };

  if (isAddingNew) {
    return (
      <form onSubmit={handleQuickAdd} className="inline-flex items-center space-x-1.5 animate-in fade-in">
        <input
          type="text"
          autoFocus
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New Category Name..."
          className="bg-white dark:bg-[#050505] border border-blue-500 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none shadow-xs w-36"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-xs flex items-center"
        >
          <Check className="w-3.5 h-3.5 mr-0.5" />
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAddingNew(false);
            setNewCategoryName('');
          }}
          className="text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-1.5 py-1"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-1.5 ${className}`}>
      {/* Category Dropdown with custom CSS styling */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-2.5 pointer-events-none flex items-center">
          {value !== 'all' ? currentStyle.icon : <Tag className="w-3 h-3 text-slate-400" />}
        </div>

        <select
          value={value}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === '__ADD_NEW__') {
              setIsAddingNew(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className={`appearance-none pl-7 pr-7 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
            value === 'all'
              ? 'bg-slate-100 dark:bg-[#1C1C1E] border-slate-300 dark:border-[#2C2C2E] text-slate-800 dark:text-white'
              : currentStyle.bg
          }`}
        >
          {allowAllOption && <option value="all">All Categories</option>}

          <optgroup label="Standard Categories">
            <option value="work">Work</option>
            <option value="social">Social</option>
            <option value="reminder">Reminder</option>
            <option value="other">Other</option>
          </optgroup>

          {combinedCategories.filter((c) => !STANDARD_CATEGORIES.includes(c)).length > 0 && (
            <optgroup label="Custom Categories">
              {combinedCategories
                .filter((c) => !STANDARD_CATEGORIES.includes(c))
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
            </optgroup>
          )}

          {!disabled && (
            <option value="__ADD_NEW__" className="text-blue-600 font-bold">
              + Quick Add New Category...
            </option>
          )}
        </select>

        {/* Custom Chevron indicator */}
        <div className="absolute right-2.5 pointer-events-none text-[10px] opacity-60">
          ▼
        </div>
      </div>

      {/* Quick Add Button shortcut right next to the dropdown */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] hover:bg-blue-100 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-[#3A3A3C] transition"
          title="Quick Add New Event Category"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
