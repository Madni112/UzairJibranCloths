import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MdSearch, MdKeyboardArrowDown, MdCheck, MdClose } from 'react-icons/md';
import { UomItem } from '../service/uomService';

interface SearchableUomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  uoms?: (UomItem | string)[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
  isRTL?: boolean;
  disabled?: boolean;
}

export const SearchableUomDropdown: React.FC<SearchableUomDropdownProps> = ({
  value,
  onChange,
  uoms = [],
  placeholder = 'Select UOM',
  className = '',
  compact = false,
  isRTL = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize UOM items to uniform shape
  const normalizedUoms: { short_code: string; full_name?: string }[] = useMemo(() => {
    return uoms.map(u => {
      if (typeof u === 'string') {
        return { short_code: u, full_name: u };
      }
      return {
        short_code: u.short_code,
        full_name: u.full_name
      };
    });
  }, [uoms]);

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

  // Filtered options based on search query
  const filtered = useMemo(() => {
    if (!query.trim()) return normalizedUoms;
    const q = query.trim().toLowerCase();
    return normalizedUoms.filter(u =>
      u.short_code.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  }, [normalizedUoms, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code.toUpperCase());
    setIsOpen(false);
    setQuery('');
  };

  const cleanQueryUpper = query.trim().toUpperCase();
  const exactMatchExists = normalizedUoms.some(
    u => u.short_code.toUpperCase() === cleanQueryUpper
  );
  const showCustomOption = cleanQueryUpper.length > 0 && !exactMatchExists;
  const totalItemsCount = filtered.length + (showCustomOption ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % (totalItemsCount || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + (totalItemsCount || 1)) % (totalItemsCount || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showCustomOption && highlightedIndex === filtered.length) {
        handleSelect(cleanQueryUpper);
      } else if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex].short_code);
      } else if (showCustomOption) {
        handleSelect(cleanQueryUpper);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  const selectedItem = normalizedUoms.find(
    u => u.short_code.toUpperCase() === String(value || '').toUpperCase()
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      onKeyDown={handleKeyDown}
    >
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between border border-stroke dark:border-strokedark transition outline-none cursor-pointer select-none ${
          compact
            ? 'rounded-lg bg-white dark:bg-meta-4 py-1.5 px-2 text-xs font-mono font-bold text-black dark:text-white hover:border-primary'
            : 'rounded-lg bg-transparent py-2 px-3 text-xs text-black dark:text-white font-medium hover:border-primary focus:border-primary dark:bg-meta-4'
        } ${isOpen ? 'border-primary ring-1 ring-primary/30' : ''}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-mono font-bold uppercase truncate">
            {value || placeholder}
          </span>
          {!compact && selectedItem?.full_name && selectedItem.full_name !== selectedItem.short_code && (
            <span className="text-[11px] text-gray-400 truncate hidden sm:inline">
              ({selectedItem.full_name})
            </span>
          )}
        </div>
        <MdKeyboardArrowDown
          className={`text-base shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-[99999] rounded-xl border border-stroke bg-white p-2 shadow-2xl dark:border-strokedark dark:bg-boxdark animate-fadeIn ${
            compact ? 'min-w-[200px] left-0 sm:left-auto sm:right-0' : 'w-full min-w-[220px] left-0'
          }`}
        >
          {/* Search Box */}
          <div className="relative mb-2">
            <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isRTL ? 'اکائی تلاش کریں...' : 'Search UOM (e.g., mtr, pcs)...'}
              className="w-full rounded-lg border border-stroke bg-slate-50 py-1.5 pl-8 pr-7 text-xs font-medium outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-danger p-0.5"
              >
                <MdClose className="text-xs" />
              </button>
            )}
          </div>

          {/* UOM List */}
          <div
            ref={listRef}
            className="max-h-52 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-meta-4"
          >
            {filtered.map((u, idx) => {
              const isSelected = u.short_code.toUpperCase() === String(value || '').toUpperCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={u.short_code + idx}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSelect(u.short_code);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs ${
                    isHighlighted
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : isSelected
                      ? 'bg-gray-100 font-bold dark:bg-meta-4 text-black dark:text-white'
                      : 'hover:bg-gray-50 dark:hover:bg-meta-4/60 text-black dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-meta-4 text-primary text-[11px] shrink-0 border border-stroke dark:border-strokedark">
                      {u.short_code}
                    </span>
                    {u.full_name && (
                      <span className="truncate text-gray-600 dark:text-gray-300 text-[11px]">
                        {u.full_name}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <MdCheck className="text-primary text-sm shrink-0 ml-1" />
                  )}
                </div>
              );
            })}

            {/* Custom UOM option if typed query doesn't match existing */}
            {showCustomOption && (
              <div
                onMouseDown={e => {
                  e.preventDefault();
                  handleSelect(cleanQueryUpper);
                }}
                onMouseEnter={() => setHighlightedIndex(filtered.length)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs border border-dashed border-primary/40 ${
                  highlightedIndex === filtered.length
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'bg-primary/5 text-primary hover:bg-primary/10'
                }`}
              >
                <div className="truncate">
                  <span className="font-semibold block text-[11px]">
                    {isRTL ? `کسٹم اکائی استعمال کریں: "${cleanQueryUpper}"` : `Use custom UOM: "${cleanQueryUpper}"`}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {isRTL ? 'Enter دبائیں یا کلک کریں' : 'Press Enter or click to use'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                  + ADD
                </span>
              </div>
            )}

            {filtered.length === 0 && !showCustomOption && (
              <div className="py-4 text-center text-xs text-gray-400">
                {isRTL ? 'کوئی اکائی نہیں ملی' : 'No matching UOM found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableUomDropdown;
