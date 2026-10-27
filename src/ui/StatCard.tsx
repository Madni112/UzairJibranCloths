import React from 'react';
import { IconType } from 'react-icons';
import { LuArrowUpRight } from 'react-icons/lu';

interface StatCardProps {
  title: string;
  value: number | string;
  Icon: IconType;
  /** Tailwind gradient class for the icon background (legacy prop, preserved for compatibility) */
  bgColor?: string;
  decimals?: number;
  thisMonthValue?: number | string;
  thisMonthLabel?: string;
  onClick?: () => void;
}

interface StatTheme {
  indicatorBg: string;
  iconBgClass: string;
  borderHover: string;
}

const STAT_THEMES: Record<string, StatTheme> = {
  cash: {
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
    borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
  },
  'bank balance': {
    indicatorBg: 'bg-blue-500',
    iconBgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
    borderHover: 'hover:border-blue-300 dark:hover:border-blue-700/60',
  },
  bank: {
    indicatorBg: 'bg-blue-500',
    iconBgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
    borderHover: 'hover:border-blue-300 dark:hover:border-blue-700/60',
  },
  receivables: {
    indicatorBg: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60',
    borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700/60',
  },
  'stock assets': {
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700/60',
  },
  stock: {
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700/60',
  },
  "today's sales": {
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
    borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
  },
  'this month sales': {
    indicatorBg: 'bg-purple-500',
    iconBgClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60',
    borderHover: 'hover:border-purple-300 dark:hover:border-purple-700/60',
  },
  'pending warehouse dispatch': {
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700/60',
  },
  'pending dispatches': {
    indicatorBg: 'bg-rose-500',
    iconBgClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60',
    borderHover: 'hover:border-rose-300 dark:hover:border-rose-700/60',
  },
  'dispatched invoices': {
    indicatorBg: 'bg-teal-500',
    iconBgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60',
    borderHover: 'hover:border-teal-300 dark:hover:border-teal-700/60',
  },
  'dispatched challans': {
    indicatorBg: 'bg-teal-500',
    iconBgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60',
    borderHover: 'hover:border-teal-300 dark:hover:border-teal-700/60',
  },
  'counter dispatches': {
    indicatorBg: 'bg-teal-500',
    iconBgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60',
    borderHover: 'hover:border-teal-300 dark:hover:border-teal-700/60',
  },
  'a-39 total storage stock': {
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700/60',
  },
  'shop floor stock units': {
    indicatorBg: 'bg-blue-500',
    iconBgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
    borderHover: 'hover:border-blue-300 dark:hover:border-blue-700/60',
  },
  'transfers out to shop': {
    indicatorBg: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60',
    borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700/60',
  },
  'transfers in from a-39': {
    indicatorBg: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60',
    borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700/60',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  Icon,
  decimals,
  thisMonthValue,
  thisMonthLabel = 'This Month',
  onClick,
}) => {
  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: decimals !== undefined ? decimals : Number.isInteger(value) ? 0 : 2,
          maximumFractionDigits: decimals !== undefined ? decimals : Number.isInteger(value) ? 0 : 2,
        })
      : value;

  const strVal = String(formattedValue || '0');
  const prefixMatch = strVal.match(/^(Rs\.\s*|PKR\s*|\$\s*)(.*)$/i);
  const currencyPrefix = prefixMatch ? prefixMatch[1].trim() : null;
  const mainNumber = prefixMatch ? prefixMatch[2].trim() : strVal;

  const getFontSize = (len: number) => {
    if (len > 15) return 'text-sm sm:text-base';
    if (len > 12) return 'text-base sm:text-lg';
    if (len > 9) return 'text-lg sm:text-xl';
    if (len > 7) return 'text-xl sm:text-2xl';
    return 'text-2xl sm:text-[26px]';
  };

  const fontSizeClass = getFontSize(mainNumber.length);

  const isNegative = typeof thisMonthValue === 'number' && thisMonthValue < 0;
  const absThisMonth = typeof thisMonthValue === 'number' ? Math.abs(thisMonthValue) : thisMonthValue;
  const formattedThisMonth =
    typeof absThisMonth === 'number'
      ? absThisMonth.toLocaleString(undefined, {
          minimumFractionDigits: decimals !== undefined ? decimals : Number.isInteger(absThisMonth) ? 0 : 2,
          maximumFractionDigits: decimals !== undefined ? decimals : Number.isInteger(absThisMonth) ? 0 : 2,
        })
      : absThisMonth;

  const key = title.toLowerCase().trim();
  const theme = STAT_THEMES[key] || {
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
    borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${theme.borderHover} transition-all duration-200 overflow-hidden select-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Concept 2: Linear Accent Indicator Notch */}
      <span
        className={`absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full ${theme.indicatorBg} shadow-xs transition-all duration-200 group-hover:w-2`}
      />

      <div className="flex items-start justify-between gap-2.5 pl-2.5">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate">
              {title}
            </span>
            {onClick && (
              <LuArrowUpRight
                size={13}
                className="text-slate-400 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-200 shrink-0"
              />
            )}
          </div>
          <div
            className="flex items-baseline mt-1.5 flex-nowrap overflow-visible"
            title={String(formattedValue)}
          >
            {currencyPrefix && (
              <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mr-1 shrink-0 select-none">
                {currencyPrefix}
              </span>
            )}
            <span className={`${fontSizeClass} font-black text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap`}>
              {mainNumber}
            </span>
          </div>
        </div>

        {/* Translucent Jewel Icon Bubble */}
        <div
          className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-2xs ${theme.iconBgClass} group-hover:scale-105 transition-transform duration-200 shrink-0 mt-0.5`}
          title={onClick ? 'Click to view full mathematical breakdown' : undefined}
        >
          <Icon size={20} className="sm:text-[22px]" />
        </div>
      </div>

      {thisMonthValue !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11.5px] pl-2.5">
          <span className="text-slate-400 dark:text-slate-500 font-medium">{thisMonthLabel}:</span>
          <span
            className={`font-bold font-mono px-2 py-0.5 rounded-md ${
              isNegative
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200'
            }`}
          >
            {isNegative ? '-' : ''}Rs. {formattedThisMonth}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
