import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MdSearch, MdKeyboardArrowDown, MdCheck, MdClose } from 'react-icons/md';

export interface SearchableOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  options: (string | SearchableOption)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options into SearchableOption format
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { id: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase().trim();
    return normalizedOptions.filter(o => 
      o.label.toLowerCase().includes(q) ||
      (o.subLabel && o.subLabel.toLowerCase().includes(q)) ||
      o.id.toLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = normalizedOptions.find(o => o.id === value);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[highlightedIndex];
      if (chosen) handleSelect(chosen.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={`relative ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        className={`w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-3 py-2 text-xs font-semibold min-h-[38px] flex items-center justify-between gap-2 transition outline-none select-none ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <MdKeyboardArrowDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-[999999] w-full min-w-[240px] bg-white dark:bg-[#1A222C] border border-stroke dark:border-strokedark rounded-xl shadow-2xl p-2 space-y-1.5">
          {/* Search Box */}
          <div className="relative">
            <MdSearch size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <MdClose size={14} />
              </button>
            )}
          </div>

          {/* List Options */}
          <div ref={listRef} className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filtered.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 italic">
                No matching options
              </div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.id === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div>{opt.label}</div>
                      {opt.subLabel && <div className="text-[10px] text-slate-400">{opt.subLabel}</div>}
                    </div>
                    {isSelected && <MdCheck size={16} className="text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

