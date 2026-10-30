import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MdSearch,
  MdClose,
  MdKeyboardArrowDown,
  MdAdd,
  MdCheck,
  MdInventory2
} from 'react-icons/md';

export interface CatalogProduct {
  id?: string | number;
  product_name: string;
  item_sr_no?: string;
  category?: string;
  uom?: string;
  purchase_price?: number | string;
  sales_price?: number | string;
  current_stock?: number | string;
}

interface SearchableProductSelectProps {
  products: CatalogProduct[];
  value: string;
  onChange: (productName: string, selectedProduct?: CatalogProduct | null) => void;
  placeholder?: string;
  allowCustom?: boolean;
  priceType?: 'purchase' | 'sales';
  isRTL?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Type or choose product...',
  allowCustom = true,
  priceType = 'sales',
  isRTL = false,
  disabled = false,
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching products based on typed value
  const filteredProducts = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return products.slice(0, 40); // show top 40 when blank

    return products
      .filter(p => {
        const nameMatch = String(p.product_name || '').toLowerCase().includes(q);
        const codeMatch = String(p.item_sr_no || '').toLowerCase().includes(q);
        const catMatch = String(p.category || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || catMatch;
      })
      .slice(0, 40);
  }, [products, value]);

  // Check if typed value is an exact catalog match
  const exactMatchExists = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return true;
    return products.some(p => String(p.product_name || '').trim().toLowerCase() === q);
  }, [products, value]);

  const canAddCustom = Boolean(allowCustom && (value || '').trim() && !exactMatchExists);
  const totalItemsCount = filteredProducts.length + (canAddCustom ? 1 : 0);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [value, isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectProduct = (product: CatalogProduct) => {
    onChange(product.product_name, product);
    setIsOpen(false);
  };

  const handleSelectCustom = (customName: string) => {
    const clean = customName.trim();
    if (!clean) return;
    onChange(clean, null);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    if (inputRef.current) inputRef.current.focus();
  };

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
      if (canAddCustom && highlightedIndex === filteredProducts.length) {
        handleSelectCustom(value);
      } else if (filteredProducts[highlightedIndex]) {
        handleSelectProduct(filteredProducts[highlightedIndex]);
      } else if (allowCustom && value.trim()) {
        handleSelectCustom(value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      onKeyDown={handleKeyDown}
    >
      {/* Direct Interactive Combobox Input */}
      <div
        className={`flex items-center w-full min-h-[38px] rounded-lg border bg-white dark:bg-boxdark transition-all ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-sm'
            : 'border-stroke dark:border-strokedark hover:border-gray-400 dark:hover:border-strokedark'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-meta-4' : ''}`}
      >
        <div className="pl-3 pr-2 text-gray-400 flex items-center">
          <MdSearch className="text-lg" />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={e => {
            const val = e.target.value;
            // Check if exact catalog product match
            const matched = products.find(
              p => String(p.product_name || '').trim().toLowerCase() === val.trim().toLowerCase()
            );
            onChange(val, matched || null);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full bg-transparent py-2 pr-2 text-sm text-black dark:text-white outline-none placeholder:text-gray-400"
        />

        <div className="flex items-center gap-1 pr-2.5 pl-1 flex-shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-danger hover:bg-gray-100 dark:hover:bg-meta-4 transition"
              title={isRTL ? 'صاف کریں' : 'Clear'}
            >
              <MdClose className="text-sm" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-primary transition"
          >
            <MdKeyboardArrowDown
              className={`text-xl transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[9999] rounded-xl border border-stroke bg-white p-1.5 shadow-2xl dark:border-strokedark dark:bg-boxdark animate-fadeIn min-w-[280px]">
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-meta-4"
          >
            {filteredProducts.map((p, idx) => {
              const isSelected =
                String(value).trim().toLowerCase() === String(p.product_name).trim().toLowerCase();
              const isHighlighted = idx === highlightedIndex;
              const price =
                priceType === 'purchase'
                  ? p.purchase_price
                  : p.sales_price || p.purchase_price;

              return (
                <div
                  key={p.id || idx}
                  onMouseDown={e => {
                    e.preventDefault(); // prevent blur
                    handleSelectProduct(p);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-xs ${
                    isHighlighted
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : isSelected
                      ? 'bg-gray-100 font-semibold dark:bg-meta-4'
                      : 'hover:bg-gray-50 dark:hover:bg-meta-4/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-medium text-black dark:text-white truncate">
                        {p.product_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5 font-mono">
                        {p.item_sr_no && (
                          <span className="font-semibold text-primary">{p.item_sr_no}</span>
                        )}
                        {p.category && <span>• {p.category}</span>}
                        {p.uom && <span>• ({p.uom})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {price !== undefined && price !== null && Number(price) > 0 && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        PKR {Number(price).toLocaleString()}
                      </span>
                    )}
                    {isSelected && <MdCheck className="text-primary text-base" />}
                  </div>
                </div>
              );
            })}

            {/* Custom Option at bottom if typed value does not match catalog */}
            {canAddCustom && (
              <div
                onMouseDown={e => {
                  e.preventDefault();
                  handleSelectCustom(value);
                }}
                onMouseEnter={() => setHighlightedIndex(filteredProducts.length)}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border border-dashed border-primary/40 bg-primary/5 text-primary text-xs transition ${
                  highlightedIndex === filteredProducts.length ? 'bg-primary/15' : ''
                }`}
              >
                <MdAdd className="text-base flex-shrink-0" />
                <span className="truncate">
                  {isRTL ? 'کسٹم آئٹم منتخب کریں:' : 'Use custom item:'}{' '}
                  <strong className="underline">{value.trim()}</strong>
                </span>
              </div>
            )}

            {filteredProducts.length === 0 && !canAddCustom && (
              <div className="py-4 text-center text-xs text-gray-400">
                {isRTL ? 'کوئی پروڈکٹ نہیں ملی' : 'No products found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;
