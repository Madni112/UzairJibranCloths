import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

export interface AccountOption {
  account_code: string;
  account_title: string;
  account_type?: string;
  balance_nature?: string;
}

interface AccountComboboxProps {
  accounts: AccountOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AccountCombobox: React.FC<AccountComboboxProps> = ({
  accounts = [],
  value = '',
  onChange,
  placeholder = 'Search Description...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedAccount = useMemo(() => {
    if (!value) return null;
    return accounts.find(a => String(a.account_code).trim() === String(value).trim()) || null;
  }, [accounts, value]);

  // Sync display text with selected account
  useEffect(() => {
    if (selectedAccount) {
      setInputValue(`${selectedAccount.account_code} - ${selectedAccount.account_title}`);
    } else if (!isOpen) {
      setInputValue('');
    }
  }, [selectedAccount, isOpen]);

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 380),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        if (selectedAccount) {
          setInputValue(`${selectedAccount.account_code} - ${selectedAccount.account_title}`);
        } else {
          setInputValue('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAccount]);

  const filteredAccounts = useMemo(() => {
    if (!isOpen) return accounts;
    const q = inputValue.trim().toLowerCase();
    if (!q || (selectedAccount && inputValue === `${selectedAccount.account_code} - ${selectedAccount.account_title}`)) {
      return accounts.slice(0, 60);
    }
    return accounts
      .filter(a => {
        const code = String(a.account_code || '').toLowerCase();
        const title = String(a.account_title || '').toLowerCase();
        return code.includes(q) || title.includes(q);
      })
      .slice(0, 60);
  }, [accounts, inputValue, isOpen, selectedAccount]);

  const handleSelect = (acc: AccountOption) => {
    onChange(acc.account_code);
    setInputValue(`${acc.account_code} - ${acc.account_title}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredAccounts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredAccounts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAccounts[highlightedIndex]) {
        handleSelect(filteredAccounts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      if (selectedAccount) {
        setInputValue(`${selectedAccount.account_code} - ${selectedAccount.account_title}`);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={e => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-white dark:bg-boxdark font-bold border border-stroke dark:border-strokedark rounded p-2 pr-7 outline-none text-xs text-black dark:text-white focus:border-primary shadow-xs"
        />

        {Boolean(value || inputValue) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10 cursor-pointer"
            title="Deselect Account"
          >
            <MdClose size={14} />
          </button>
        )}
      </div>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="min-w-[360px] max-w-[480px] max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 animate-in fade-in zoom-in-95 duration-100"
          >
            {filteredAccounts.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400 italic">No matching accounts found</div>
            ) : (
              filteredAccounts.map((p, pIdx) => {
                const isHighlighted = pIdx === highlightedIndex;
                const isSelected = selectedAccount?.account_code === p.account_code;
                return (
                  <div
                    key={p.account_code}
                    onMouseEnter={() => setHighlightedIndex(pIdx)}
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(p);
                    }}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(p);
                    }}
                    className={`p-3 cursor-pointer transition flex items-start justify-between gap-3 group ${
                      isHighlighted || isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 leading-normal break-words whitespace-normal">
                        {p.account_title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold text-primary">
                          {p.account_code}
                        </span>
                        {p.account_type && <span className="break-words whitespace-normal">• {p.account_type}</span>}
                      </div>
                    </div>

                    {p.balance_nature && (
                      <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {p.balance_nature}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default AccountCombobox;
