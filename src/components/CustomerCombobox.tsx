import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MdSearch, MdClose, MdPerson, MdPhone, MdLocationOn } from 'react-icons/md';

export interface CustomerComboboxItem {
  id: string | number;
  name: string;
  phone?: string;
  address?: string;
}

interface CustomerComboboxProps {
  customers: CustomerComboboxItem[];
  value: string;
  onChange: (val: string) => void;
  onSelectCustomer?: (customer: CustomerComboboxItem | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
  customers = [],
  value = '',
  onChange,
  onSelectCustomer,
  placeholder = 'Search or enter customer name...',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 50);
    const q = query.toLowerCase().trim();
    return customers
      .filter(c => {
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const addr = (c.address || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || addr.includes(q);
      })
      .slice(0, 50);
  }, [customers, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (customer: CustomerComboboxItem) => {
    setQuery(customer.name);
    onChange(customer.name);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    if (onSelectCustomer) {
      onSelectCustomer(null);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="text"
          required={required}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full text-xs font-semibold px-3 py-2.5 pr-8 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:border-emerald-500 focus:outline-hidden"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <MdClose size={14} />
          </button>
        )}
      </div>

      {isOpen && filteredCustomers.length > 0 && (
        <div className="absolute z-99999 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark shadow-xl divide-y divide-stroke dark:divide-strokedark">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5 truncate">
                  <MdPerson className="text-emerald-600 shrink-0" />
                  <span>{customer.name}</span>
                </p>
                {customer.address && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                    <MdLocationOn className="shrink-0" />
                    <span>{customer.address}</span>
                  </p>
                )}
              </div>
              {customer.phone && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1 shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-bold">
                  <MdPhone size={10} />
                  <span>{customer.phone}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerCombobox;
