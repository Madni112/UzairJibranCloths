import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MdSearch,
  MdClose,
  MdKeyboardArrowDown,
  MdAdd,
  MdCheck,
  MdInventory2,
  MdSell
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
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Select product...',
  allowCustom = true,
  priceType = 'sales',
  isRTL = false,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // When opening, autofocus the search input and prefill with nothing or query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Filter matching products
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 50); // limit to top 50 when empty for instant performance

    return products
      .filter(p => {
        const nameMatch = String(p.product_name || '').toLowerCase().includes(q);
        const codeMatch = String(p.item_sr_no || '').toLowerCase().includes(q);
        const catMatch = String(p.category || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || catMatch;
      })
      .slice(0, 50);
  }, [products, query]);

  // Check if typed query is an exact match
  const exactMatchExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return products.some(p => String(p.product_name || '').trim().toLowerCase() === q);
  }, [products, query]);

  const canAddCustom = Boolean(allowCustom && query.trim() && !exactMatchExists);
  const totalItemsCount = filteredProducts.length + (canAddCustom ? 1 : 0);

  // Selected product object
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return (
      products.find(
        p => String(p.product_name || '').trim().toLowerCase() === String(value).trim().toLowerCase()
      ) || null
    );
  }, [products, value]);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
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
        handleSelectCustom(query);
      } else if (filteredProducts[highlightedIndex]) {
        handleSelectProduct(filteredProducts[highlightedIndex]);
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
      {/* Trigger Button / Display */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full min-h-[42px] px-3 py-2 rounded-lg border bg-white dark:bg-boxdark cursor-pointer select-none transition-all ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-sm'
            : 'border-stroke dark:border-strokedark hover:border-gray-400 dark:hover:border-strokedark'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-meta-4' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          <MdInventory2 className="text-gray-400 text-lg flex-shrink-0" />
          {value ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm font-medium text-black dark:text-white truncate">
                {value}
              </span>
              {selectedProduct?.item_sr_no && (
                <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                  {selectedProduct.item_sr_no}
                </span>
              )}
              {selectedProduct?.category && (
                <span className="text-[10px] text-gray-400 hidden sm:inline flex-shrink-0">
                  ({selectedProduct.category})
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-danger hover:bg-gray-100 dark:hover:bg-meta-4 transition"
              title={isRTL ? 'صاف کریں' : 'Clear selection'}
            >
              <MdClose className="text-sm" />
            </button>
          )}
          <MdKeyboardArrowDown
            className={`text-gray-400 text-xl transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </div>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-stroke bg-white p-2 shadow-2xl dark:border-strokedark dark:bg-boxdark animate-fadeIn">
          {/* Live Search Input */}
          <div className="relative mb-2">
            <MdSearch
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-lg ${
                isRTL ? 'right-2.5' : 'left-2.5'
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={
                isRTL
                  ? 'نام یا کوڈ لکھ کر تلاش کریں...'
                  : 'Search by name, SKU or category...'
              }
              className={`w-full rounded-lg border border-stroke bg-gray-50 py-2 text-xs outline-none focus:border-primary focus:bg-white dark:border-strokedark dark:bg-meta-4 dark:focus:bg-boxdark ${
                isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white ${
                  isRTL ? 'left-2.5' : 'right-2.5'
                }`}
              >
                <MdClose className="text-sm" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-meta-4"
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
                  onClick={() => handleSelectProduct(p)}
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

            {/* Custom Option at bottom if typed text does not exist */}
            {canAddCustom && (
              <div
                onClick={() => handleSelectCustom(query)}
                onMouseEnter={() => setHighlightedIndex(filteredProducts.length)}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border border-dashed border-primary/40 bg-primary/5 text-primary text-xs transition ${
                  highlightedIndex === filteredProducts.length ? 'bg-primary/15' : ''
                }`}
              >
                <MdAdd className="text-base flex-shrink-0" />
                <span className="truncate">
                  {isRTL ? 'یہ پروڈکٹ استعمال کریں:' : 'Use custom product:'}{' '}
                  <strong className="underline">{query.trim()}</strong>
                </span>
              </div>
            )}

            {filteredProducts.length === 0 && !canAddCustom && (
              <div className="py-6 text-center text-xs text-gray-400">
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
