import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

// Master UI translations dictionary
export const TRANSLATIONS: Record<string, { en: string; ur: string }> = {
  // Top Navbar & Global
  search_placeholder: { en: 'Search invoices, customers, products... (Ctrl+K)', ur: 'انوائس، کسٹمر، آئٹم تلاش کریں... (Ctrl+K)' },
  portal_active: { en: 'Portal Active', ur: 'پورٹل فعال' },
  new_sale: { en: 'New Sale', ur: 'نئی سیل' },
  settings: { en: 'Settings', ur: 'سیٹنگز' },
  logout: { en: 'Log Out', ur: 'لاگ آؤٹ' },
  language: { en: 'Language', ur: 'زبان' },

  // Navigation Main Sections
  dashboard: { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  administration: { en: 'Administration', ur: 'انتظامیہ' },
  registration: { en: 'Registration', ur: 'رجسٹریشن' },
  sales: { en: 'Sales', ur: 'سیلز (فروخت)' },
  purchase: { en: 'Purchase', ur: 'پرچیز (خریداری)' },
  human_resource: { en: 'Human Resource', ur: 'ہیومن ریسورس (HR)' },
  reports: { en: 'Reports', ur: 'رپورٹس' },

  // Registration Sub-menus
  chart_of_account: { en: 'Chart Of Account', ur: 'چارٹ آف اکاؤنٹس' },
  chart_of_accounts: { en: 'Chart of Accounts', ur: 'چارٹ آف اکاؤنٹس' },
  vouchers: { en: 'Vouchers', ur: 'واؤچرز' },
  bank_account: { en: 'Bank Account', ur: 'بینک اکاؤنٹس' },
  opening_stock: { en: 'Opening Stock', ur: 'ابتدائی اسٹاک' },

  // Administration Sub-menus
  categories: { en: 'Categories', ur: 'کیٹیگریز' },
  brands: { en: 'Brands', ur: 'برانڈز' },
  brand: { en: 'Brand', ur: 'برانڈز' },
  uoms: { en: 'UOMs', ur: 'پیمائش کی اکائیاں' },
  products: { en: 'Products', ur: 'پروڈکٹس (اشیاء)' },
  bulk_upload: { en: 'Bulk Upload', ur: 'بلک اپلوڈ' },
  company: { en: 'Company', ur: 'کمپنی' },

  // Sales Sub-menus
  quotations: { en: 'Quotations', ur: 'کوٹیشنز' },
  invoice: { en: 'Invoice', ur: 'انوائس / بل' },
  invoice_receipt: { en: 'Invoice Receipt', ur: 'انوائس وصولی رسید' },
  sales_return: { en: 'Sales Return', ur: 'سیلز واپسی' },
  sales_return_receipt: { en: 'Sales Return Receipt', ur: 'سیلز واپسی رسید' },
  customers: { en: 'Customers', ur: 'کسٹمرز (گاہک)' },
  salesman: { en: 'Salesman', ur: 'سیلزمین' },

  // Purchase Sub-menus
  purchases: { en: 'Purchases', ur: 'پرچیز آرڈرز' },
  goods_receipt_grn: { en: 'Goods Receipt (GRN)', ur: 'مال وصولی رسید (GRN)' },
  purchase_receipt: { en: 'Purchase Receipt', ur: 'پرچیز رسید' },
  purchase_return: { en: 'Purchase Return', ur: 'خریداری واپسی' },
  purchase_return_receipt: { en: 'Purchase Return Receipt', ur: 'واپسی رسید' },
  vendor: { en: 'Vendor', ur: 'وینڈرز (سپلائر)' },

  // Locations & Warehouse
  locations: { en: 'Locations', ur: 'مقامات / گودام' },
  assigned_locations: { en: 'Assigned Locations', ur: 'تفویض شدہ گودام' },
  stock_transfer: { en: 'Stock Transfer', ur: 'اسٹاک منتقلی' },
  transportation: { en: 'Transportation', ur: 'ترسیل و ٹرانسپورٹ' },
  delivery_challan: { en: 'Delivery Challan', ur: 'ڈلیوری چالان' },
  shop_dispatch_queue: { en: 'Shop Dispatch Queue (SDQ)', ur: 'دکان ڈسپیچ قطار' },
  inward_challan: { en: 'Inward Challan', ur: 'وصولی چالان' },
  shop_receiving_queue: { en: 'Shop Receiving Queue', ur: 'دکان وصولی قطار' },

  // HR Sub-menus
  employees: { en: 'Employees', ur: 'ملازمین' },
  attendance_sheet: { en: 'Attendance Sheet', ur: 'حاضری رجسٹر' },
  salary_sheet: { en: 'Salary Sheet (Payroll)', ur: 'تنخواہ شیٹ (پے رول)' },
  leaves: { en: 'Leaves', ur: 'چھٹیاں' },
  loans_advances: { en: 'Loans & Advances', ur: 'قرضے و ایڈوانس' },

  // Reports Sub-menus
  sales_report: { en: 'Sales Report', ur: 'سیلز رپورٹ' },
  purchase_report: { en: 'Purchase Report', ur: 'پرچیز رپورٹ' },
  stock_report: { en: 'Stock Report', ur: 'اسٹاک رپورٹ' },
  account_report: { en: 'Account Report', ur: 'کھاتہ رپورٹ' },
  holding_item_report: { en: 'Holding Item Report', ur: 'ہولڈنگ آئٹم رپورٹ' },
  balance_sheet: { en: 'Balance Sheet', ur: 'بیلنس شیٹ' },
  report_filter: { en: 'Report Filter', ur: 'رپورٹ فلٹر' },

  // Dashboard Page
  role_dashboard_preview: { en: 'Role Dashboard Preview:', ur: 'ڈیش بورڈ پیش نظارہ:' },
  executive_overview: { en: 'Executive Overview', ur: 'مرکزی جائزہ' },
  salesman_view: { en: 'Salesman View', ur: 'سیلزمین ویو' },
  warehouse: { en: 'Warehouse', ur: 'گودام' },
  executive_dashboard_title: { en: 'Executive Management Dashboard', ur: 'انتظامی مینجمنٹ ڈیش بورڈ' },
  executive_dashboard_subtitle: { en: 'Real-time fiscal monitoring, procurement velocity & operational intelligence', ur: 'مالی نگرانی، خریداری اور آپریشنل تفاصیل' },
  customer_bill: { en: 'Customer Bill', ur: 'کسٹمر بل' },
  buy_new_product: { en: 'Buy New Product', ur: 'نیا مال خریدیں' },
  items_list: { en: 'Items List', ur: 'اشیاء کی فہرست' },
  customer_return: { en: 'Customer Return', ur: 'کسٹمر واپسی' },
  inventory_audit: { en: 'Inventory Audit', ur: 'انوینٹری آڈٹ' },
  todays_sale: { en: "Today's Sale", ur: 'آج کی سیلز' },
  this_month_sales: { en: 'This Month Sales', ur: 'اس ماہ کی سیلز' },
  this_month_purchases: { en: 'This Month Purchases', ur: 'اس ماہ کی خریداری' },
  cash: { en: 'Cash', ur: 'نقد کیش' },
  bank_balance: { en: 'Bank Balance', ur: 'بینک بیلنس' },
  receivables: { en: 'Receivables', ur: 'وصول طلب رقم' },
  stock_assets: { en: 'Stock Assets', ur: 'اسٹاک کے اثاثے' },
  this_month: { en: 'This Month', ur: 'اس ماہ' },
  show_operational_ledgers: { en: 'Show Operational Ledgers & Analytics', ur: 'آپریشنل لیجرز اور تجزیات دکھائیں' },
  hide_operational_ledgers: { en: 'Hide Operational Ledgers & Analytics', ur: 'آپریشنل لیجرز اور تجزیات چھپائیں' },
  live_modules: { en: 'Live Modules', ur: 'فعال ماڈیولز' },

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
  save_customer: { en: 'Save Customer', ur: 'کسٹمر محفوظ کریں' },
  cancel: { en: 'Cancel', ur: 'منسوخ' },
};

// Global direct string translation helper
export const getUrduText = (str: string): string => {
  if (!str) return str;
  const clean = str.trim().toLowerCase();
  
  // Direct key lookup
  for (const [key, val] of Object.entries(TRANSLATIONS)) {
    if (key.toLowerCase() === clean || val.en.toLowerCase() === clean) {
      return val.ur;
    }
  }

  // Common quick replacements
  const quickMap: Record<string, string> = {
    'dashboard': 'ڈیش بورڈ',
    'administration': 'انتظامیہ',
    'registration': 'رجسٹریشن',
    'sales': 'سیلز',
    'purchase': 'خریداری',
    'human resource': 'ہیومن ریسورس (HR)',
    'reports': 'رپورٹس',
    'chart of account': 'چارٹ آف اکاؤنٹس',
    'chart of accounts': 'چارٹ آف اکاؤنٹس',
    'vouchers': 'واؤچرز',
    'bank account': 'بینک اکاؤنٹس',
    'opening stock': 'ابتدائی اسٹاک',
    'categories': 'کیٹیگریز',
    'brands': 'برانڈز',
    'brand': 'برانڈز',
    'uoms': 'پیمائش کی اکائیاں',
    'products': 'پروڈکٹس',
    'bulk upload': 'بلک اپلوڈ',
    'company': 'کمپنی',
    'quotations': 'کوٹیشنز',
    'invoice': 'انوائس',
    'invoice receipt': 'انوائس رسید',
    'sales return': 'سیلز واپسی',
    'sales return receipt': 'سیلز واپسی رسید',
    'customers': 'کسٹمرز',
    'salesman': 'سیلزمین',
    'purchases': 'پرچیز آرڈرز',
    'goods receipt (grn)': 'مال وصولی رسید (GRN)',
    'purchase receipt': 'پرچیز رسید',
    'purchase return': 'خریداری واپسی',
    'purchase return receipt': 'واپسی رسید',
    'vendor': 'وینڈرز',
    'locations': 'مقامات / گودام',
    'assigned locations': 'تفویض شدہ گودام',
    'stock transfer': 'اسٹاک منتقلی',
    'transportation': 'ترسیل و ٹرانسپورٹ',
    'delivery challan': 'ڈلیوری چالان',
    'shop dispatch queue (sdq)': 'دکان ڈسپیچ قطار',
    'inward challan': 'وصولی چالان',
    'shop receiving queue': 'دکان وصولی قطار',
    'employees': 'ملازمین',
    'attendance sheet': 'حاضری رجسٹر',
    'salary sheet (payroll)': 'تنخواہ شیٹ (پے رول)',
    'leaves': 'چھٹیاں',
    'loans & advances': 'قرضے و ایڈوانس',
    'sales report': 'سیلز رپورٹ',
    'purchase report': 'پرچیز رپورٹ',
    'stock report': 'اسٹاک رپورٹ',
    'account report': 'کھاتہ رپورٹ',
    'holding item report': 'ہولڈنگ آئٹم رپورٹ',
    'balance sheet': 'بیلنس شیٹ',
    'report filter': 'رپورٹ فلٹر',
    'settings': 'سیٹنگز',
    'logout': 'لاگ آؤٹ',
    'log out': 'لاگ آؤٹ',
    'cash': 'نقد کیش',
    'bank balance': 'بینک بیلنس',
    'receivables': 'وصول طلب رقم',
    'stock assets': 'اسٹاک کے اثاثے',
    'this month': 'اس ماہ',
    "today's sale": 'آج کی سیلز',
    'this month sales': 'اس ماہ کی سیلز',
    'this month purchases': 'اس ماہ کی خریداری',
    'customer bill': 'کسٹمر بل',
    'buy new product': 'نیا مال خریدیں',
    'items list': 'اشیاء کی فہرست',
    'customer return': 'کسٹمر واپسی',
    'inventory audit': 'انوینٹری آڈٹ',
  };

  if (quickMap[clean]) return quickMap[clean];

  return str;
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

  const t = (key: string, defaultText?: string): string => {
    if (language === 'en') {
      const entry = TRANSLATIONS[key];
      return entry ? entry.en : (defaultText || key);
    }
    // Language is Urdu
    const entry = TRANSLATIONS[key];
    if (entry) return entry.ur;
    return getUrduText(defaultText || key);
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
