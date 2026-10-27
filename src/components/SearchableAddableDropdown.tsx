import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MdSearch, MdClose, MdKeyboardArrowDown, MdAdd } from 'react-icons/md';

interface SearchableAddableDropdownProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onAddNew?: (newVal: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const SearchableAddableDropdown: React.FC<SearchableAddableDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  helperText,
  required = false,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  // Determine if the typed query can be added as a new option
  const trimmedQuery = query.trim();
  const exactMatchExists = useMemo(() => {
    if (!trimmedQuery) return true;
    return options.some((opt) => opt.toLowerCase() === trimmedQuery.toLowerCase());
  }, [options, trimmedQuery]);

  const canAddNew = Boolean(trimmedQuery && !exactMatchExists);

  // List of all navigable items: filtered options + (optional add new item at bottom)
  const totalItemsCount = filteredOptions.length + (canAddNew ? 1 : 0);

  // Reset highlight index when query or open state changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (selectedVal: string) => {
    onChange(selectedVal);
    setIsOpen(false);
    setQuery('');
  };

  const handleAddNewItem = (newVal: string) => {
    const clean = newVal.trim();
    if (!clean) return;
    if (onAddNew) {
      onAddNew(clean);
    }
    onChange(clean);
    setIsOpen(false);
    setQuery('');
  };

  // Keyboard Navigation: ArrowDown, ArrowUp, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (totalItemsCount > 0 ? (prev + 1) % totalItemsCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (totalItemsCount > 0 ? (prev - 1 + totalItemsCount) % totalItemsCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalItemsCount === 0) {
        if (canAddNew) {
          handleAddNewItem(trimmedQuery);
        }
        return;
      }

      // Check if user highlighted the "+ Add" row
      if (canAddNew && highlightedIndex === filteredOptions.length) {
        handleAddNewItem(trimmedQuery);
      } else if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
          <span className="flex items-center gap-1.5">
            {icon && <span className="text-primary text-sm flex items-center">{icon}</span>}
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQuery('');
              }}
              className="text-[10px] text-slate-400 hover:text-red-500 transition cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </label>
      )}

      {/* Main Trigger Bar */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        className={`w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-semibold outline-none transition flex items-center justify-between cursor-pointer focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-primary/70 shrink-0 text-sm flex items-center">{icon}</span>}
          <span className={value ? 'text-slate-900 dark:text-white font-bold tracking-tight' : 'text-slate-400 font-normal'}>
            {value || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setQuery('');
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Clear selection"
            >
              <MdClose size={13} />
            </button>
          )}
          <MdKeyboardArrowDown
            size={18}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-400 mt-1">
          {helperText}
        </p>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute z-99999 left-0 right-0 mt-1.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input Box */}
          <div className="p-2 border-b border-stroke dark:border-strokedark bg-slate-50/70 dark:bg-slate-800/40">
            <div className="relative flex items-center">
              <MdSearch className="absolute left-3 text-slate-400 text-base pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search or type new ${placeholder}...`}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <MdClose size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
              <span>Use ↑ ↓ to navigate</span>
              <span>Press [Enter] to select / add</span>
            </div>
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar divide-y divide-slate-100/50 dark:divide-slate-800/50"
          >
            {filteredOptions.length === 0 && !canAddNew && (
              <li className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </li>
            )}

            {filteredOptions.map((opt, idx) => {
              const isSelected = value.toLowerCase() === opt.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition flex items-center justify-between ${
                    isHighlighted
                      ? 'bg-primary/10 text-primary font-bold'
                      : isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-primary font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                      Selected
                    </span>
                  )}
                </li>
              );
            })}

            {/* "+ Add New Item" option when query does not match any existing option */}
            {canAddNew && (
              <li
                onClick={() => handleAddNewItem(trimmedQuery)}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition flex items-center justify-between border-t border-dashed border-primary/40 mt-1 ${
                  highlightedIndex === filteredOptions.length
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <MdAdd size={14} />
                  </div>
                  <span className="truncate">
                    Add <span className="font-bold underline">"{trimmedQuery}"</span>
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                  Press Enter ↵
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableAddableDropdown;
