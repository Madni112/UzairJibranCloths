import React from 'react';
import { IconType } from 'react-icons';
import { LuArrowUpRight } from 'react-icons/lu';
import { useLanguage, getUrduText } from '../Context/LanguageContext';

interface ActionCardProps {
  title: string;
  subtitle: string;
  Icon: IconType;
  bgGradient?: string;
  onClick: () => void;
}

interface CardTheme {
  accentHex: string;
  indicatorBg: string;
  iconBgClass: string;
}

const CARD_THEMES: Record<string, CardTheme> = {
  sales: {
    accentHex: '#059669',
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
  },
  purchases: {
    accentHex: '#2563EB',
    indicatorBg: 'bg-blue-500',
    iconBgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
  },
  products: {
    accentHex: '#0D9488',
    indicatorBg: 'bg-teal-500',
    iconBgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60',
  },
  'sale return': {
    accentHex: '#64748B',
    indicatorBg: 'bg-slate-500',
    iconBgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  },
  'stock report': {
    accentHex: '#D97706',
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
  },
  "today's sale": {
    accentHex: '#10B981',
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
  },
  'this month sales': {
    accentHex: '#8B5CF6',
    indicatorBg: 'bg-purple-500',
    iconBgClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60',
  },
  'this month purchases': {
    accentHex: '#E11D48',
    indicatorBg: 'bg-rose-500',
    iconBgClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60',
  },
  'new sales invoice': {
    accentHex: '#059669',
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
  },
  'invoice receipts': {
    accentHex: '#2563EB',
    indicatorBg: 'bg-blue-500',
    iconBgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60',
  },
  'customers directory': {
    accentHex: '#8B5CF6',
    indicatorBg: 'bg-purple-500',
    iconBgClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60',
  },
  'live stock report': {
    accentHex: '#D97706',
    indicatorBg: 'bg-amber-500',
    iconBgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60',
  },
  'dispatch challans': {
    accentHex: '#E11D48',
    indicatorBg: 'bg-rose-500',
    iconBgClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60',
  },
  'inward challan': {
    accentHex: '#4F46E5',
    indicatorBg: 'bg-indigo-500',
    iconBgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60',
  },
  'shop receiving': {
    accentHex: '#0891B2',
    indicatorBg: 'bg-cyan-500',
    iconBgClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-800/60',
  },
  'warehouse inventory': {
    accentHex: '#0D9488',
    indicatorBg: 'bg-teal-500',
    iconBgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60',
  },
};

const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, Icon, onClick }) => {
  const { isRTL } = useLanguage();
  const key = title.toLowerCase().trim();
  const theme = CARD_THEMES[key] || {
    accentHex: '#059669',
    indicatorBg: 'bg-emerald-500',
    iconBgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60',
  };

  const displayTitle = isRTL ? getUrduText(title) : title;
  const displaySubtitle = isRTL && subtitle.startsWith('Rs.') ? subtitle : (isRTL ? getUrduText(subtitle) : subtitle);

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer overflow-hidden select-none"
    >
      {/* Concept 2: Linear Accent Indicator Notch */}
      <span
        className={`absolute top-3 bottom-3 w-1.25 ${theme.indicatorBg} shadow-xs transition-all duration-200 group-hover:w-2 ${
          isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'
        }`}
      />

      {/* Content */}
      <div className={`flex flex-col min-w-0 ${isRTL ? 'pr-2.5' : 'pl-2.5'}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
            {displayTitle}
          </span>
          <LuArrowUpRight
            size={13}
            className="text-slate-400 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-200"
          />
        </div>
        <span 
          className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full"
          title={displaySubtitle}
        >
          {displaySubtitle}
        </span>
      </div>

      {/* Icon Pill with Soft Translucent Tint */}
      <div
        className={`p-2.5 rounded-xl ${theme.iconBgClass} group-hover:scale-110 transition-transform duration-200 shrink-0 shadow-2xs`}
      >
        <Icon size={20} />
      </div>
    </div>
  );
};

export default ActionCard;
