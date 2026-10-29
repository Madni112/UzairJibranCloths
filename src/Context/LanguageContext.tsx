import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

// Comprehensive UI translations dictionary
export const TRANSLATIONS: Record<string, { en: string; ur: string }> = {
  // Top Navbar & Global
  search_placeholder: { en: 'Search invoices, customers, products... (Ctrl+K)', ur: 'انوائس، کسٹمر، آئٹم تلاش کریں... (Ctrl+K)' },
  portal_active: { en: 'Portal Active', ur: 'پورٹل فعال' },
  new_sale: { en: 'New Sale', ur: 'نئی سیل' },
  settings: { en: 'Settings', ur: 'سیٹنگز' },
  logout: { en: 'Log Out', ur: 'لاگ آؤٹ' },
  language: { en: 'Language', ur: 'زبان' },

  // Navigation Menus
  dashboard: { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  administration: { en: 'Administration', ur: 'انتظامیہ' },
  registration: { en: 'Registration', ur: 'رجسٹریشن' },
  sales: { en: 'Sales', ur: 'سیلز (فروخت)' },
  purchase: { en: 'Purchase', ur: 'پرچیز (خریداری)' },
  human_resource: { en: 'Human Resource', ur: 'ہیومن ریسورس (HR)' },
  reports: { en: 'Reports', ur: 'رپورٹس' },

  // Sales Sub-menus
  quotations: { en: 'Quotations', ur: 'کوٹیشنز' },
  invoice: { en: 'Invoice', ur: 'انوائس / بل' },
  invoice_receipt: { en: 'Invoice Receipt', ur: 'انوائس وصولی رسید' },
  sales_return: { en: 'Sales Return', ur: 'سیلز واپسی' },
  sales_return_receipt: { en: 'Sales Return Receipt', ur: 'سیلز واپسی رسید' },
  customers: { en: 'Customers', ur: 'کسٹمرز (گاہک)' },
  salesman: { en: 'Salesman', ur: 'سیلزمین' },

  // Purchase Sub-menus
  vendor: { en: 'Vendor', ur: 'وینڈرز / سپلائر' },
  purchases: { en: 'Purchases', ur: 'پرچیز آرڈرز' },
  purchase_receipt: { en: 'Purchase Receipt', ur: 'پرچیز رسید' },
  purchase_return: { en: 'Purchase Return', ur: 'خریداری واپسی' },

  // Customers UI
  customer_database: { en: 'Customer Database', ur: 'کسٹمر ڈائریکٹری' },
  manage_customers: { en: 'Manage customer directory and assign Chart of Account ledger codes', ur: 'کسٹمر کھاتہ جات اور لیجر کوڈز کا انتظام کریں' },
  add_new_customer: { en: '+ Add New Customer', ur: '+ نیا کسٹمر شامل کریں' },
  upload_excel: { en: 'Upload Excel', ur: 'ایکسل فائل اپلوڈ' },
  search_customers_placeholder: { en: 'Search name, phone, city, area, account, page #...', ur: 'نام، فون، شہر، علاقہ، کھاتہ یا صفحہ نمبر سے تلاش کریں...' },
  show_entries: { en: 'Show entries', ur: 'ریکارڈز فی صفحہ' },
  page_hash: { en: 'Page #', ur: 'صفحہ #' },
  code: { en: 'Code', ur: 'کھاتہ کوڈ' },
  name: { en: 'Name', ur: 'نام' },
  phone: { en: 'Phone', ur: 'فون نمبر' },
  city_area: { en: 'City / Area', ur: 'شہر / علاقہ' },
  city: { en: 'City', ur: 'شہر' },
  area: { en: 'Area', ur: 'علاقہ / مارکیٹ' },
  address: { en: 'Address', ur: 'پتہ' },
  accounts: { en: 'Accounts', ur: 'کھاتہ لیجر' },
  actions: { en: 'Actions', ur: 'کارروائی' },
  link_account: { en: '+ Link Account', ur: '+ کھاتہ لنک کریں' },
  edit: { en: 'Edit', ur: 'ترمیم' },
  delete: { en: 'Delete', ur: 'حذف کریں' },

  // Customer Form
  step_1_title: { en: '1. Customer Identity & Classification', ur: '1. کسٹمر شناخت اور کیٹیگری' },
  customer_name: { en: 'Customer / Business Name', ur: 'کسٹمر / دکان یا کمپنی کا نام' },
  customer_code: { en: 'Customer / Account Code', ur: 'کسٹمر / لیجر کوڈ' },
  ledger_page_no: { en: 'Ledger Page # (Optional)', ur: 'کھاتہ رجسٹر صفحہ نمبر (اختیاری)' },
  customer_tier: { en: 'Customer Tier / Category', ur: 'کسٹمر کیٹیگری / درجہ' },
  opening_balance: { en: 'Opening Balance', ur: 'ابتدائی بقایا رقم (Opening Balance)' },
  balance_nature: { en: 'Balance Nature', ur: 'رقم کی نوعیت' },
  debit_receivable: { en: 'Debit (Receivable)', ur: 'ڈیبٹ (وصول طلب)' },
  credit_advance: { en: 'Credit (Advance)', ur: 'کریڈٹ (پیشگی رقم)' },
  next_step: { en: 'Next Step', ur: 'اگلا مرحلہ' },
  save_customer: { en: 'Save Customer', ur: 'کسٹمر محفوظ کریں' },
  cancel: { en: 'Cancel', ur: 'منسوخ' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uj_language');
      if (saved === 'ur' || saved === 'en') return saved;
    }
    return 'en';
  });

  const isRTL = language === 'ur';

  // Apply dir & lang attributes on <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (language === 'ur') {
      root.setAttribute('dir', 'rtl');
      root.setAttribute('lang', 'ur');
      document.body.classList.add('rtl-active');
    } else {
      root.setAttribute('dir', 'ltr');
      root.setAttribute('lang', 'en');
      document.body.classList.remove('rtl-active');
    }
    localStorage.setItem('uj_language', language);
    window.dispatchEvent(new CustomEvent('uj_language_changed', { detail: { language } }));
  }, [language]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'ur' : 'en'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Helper translation function: looks up dictionary, or returns fallback
  const t = (key: string, defaultText?: string): string => {
    const entry = TRANSLATIONS[key];
    if (entry) {
      return language === 'ur' ? entry.ur : entry.en;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
