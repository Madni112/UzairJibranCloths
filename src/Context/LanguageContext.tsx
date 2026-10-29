import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TH_TRANSLATIONS, TOKEN_TRANSLATIONS } from './translationsData';

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
// Master Quick Map for Global UI Lookups
export const QUICK_MAP: Record<string, string> = {
  // Registration & Accounts
  'chart of accounts ledger directory': 'چارٹ آف اکاؤنٹس لیجر ڈائریکٹری',
  'chart of accounts': 'چارٹ آف اکاؤنٹس',
  'account title / group': 'کھاتہ عنوان / گروپ',
  'account title': 'کھاتہ عنوان',
  'account code': 'کھاتہ کوڈ',
  '+ add new account': '+ نیا کھاتہ شامل کریں',
  'add new account': 'نیا کھاتہ شامل کریں',
  'no ledger financial accounts found.': 'کوئی کھاتہ ریکارڈ نہیں ملا۔',
  'no ledger financial accounts found': 'کوئی کھاتہ ریکارڈ نہیں ملا۔',
  'assets .1': '1. اثاثہ جات',
  'liabilities .2': '2. واجبات',
  'equity .3': '3. سرمایہ / ایکویٹی',
  'expenses .5': '5. اخراجات',
  'revenue .4': '4. آمدن',
  '1. assets': '1. اثاثہ جات',
  '2. liabilities': '2. واجبات',
  '3. equity': '3. سرمایہ / ایکویٹی',
  '4. revenue': '4. آمدن',
  '5. expenses': '5. اخراجات',
  'assets': 'اثاثہ جات',
  'liabilities': 'واجبات',
  'equity': 'سرمایہ / ایکویٹی',
  'expenses': 'اخراجات',
  'revenue': 'آمدن',

  // Bank Accounts
  'bank accounts directory': 'بینک اکاؤنٹس ڈائریکٹری',
  'manage enterprise bank accounts, branches & iban ledgers': 'بینک اکاؤنٹس، برانچز اور کھاتہ جات کا انتظام کریں',
  '+ add bank account': '+ نیا بینک اکاؤنٹ شامل کریں',
  'add bank account': 'نیا بینک اکاؤنٹ شامل کریں',
  'account number': 'بینک اکاؤنٹ نمبر',
  'branch name': 'برانچ کا نام',
  'branch code': 'برانچ کوڈ',
  'no bank records found. click "+ add bank account" to begin.': 'کوئی بینک ریکارڈ نہیں ملا۔ نیا بینک اکاؤنٹ شامل کرنے کے لیے بٹن دبائیں۔',
  'no bank records found. click "+ add bank account" to begin': 'کوئی بینک ریکارڈ نہیں ملا۔ نیا بینک اکاؤنٹ شامل کرنے کے لیے بٹن دبائیں۔',
  'no bank records found': 'کوئی بینک ریکارڈ نہیں ملا',

  // Opening Stocks
  'opening stocks directory': 'ابتدائی اسٹاک ڈائریکٹری',
  '+ initialize opening stock': '+ ابتدائی اسٹاک درج کریں',
  'initialize opening stock +': '+ ابتدائی اسٹاک درج کریں',
  'initialize opening stock': 'ابتدائی اسٹاک درج کریں',
  'stock no': 'اسٹاک نمبر',
  'batch no': 'بیچ نمبر',
  'opening date': 'ابتدائی تاریخ',
  'expiry date': 'میعاد ختم تاریخ',
  'no opening stock initialized yet.': 'ابھی تک ابتدائی اسٹاک درج نہیں کیا گیا۔',
  'no opening stock initialized yet': 'ابھی تک ابتدائی اسٹاک درج نہیں کیا گیا۔',

  // Invoice Receipts
  'invoice receipts directory logs': 'انوائس وصولی رسیدیں لاگ',
  '+ create receipt voucher': '+ نئی وصولی رسید بنائیں',
  'create receipt voucher +': '+ نئی وصولی رسید بنائیں',
  'create receipt voucher': 'نئی وصولی رسید بنائیں',
  'receipt slip no': 'رسید سلپ نمبر',
  'linked invoice': 'منسلک انوائس',
  'settlement method': 'ادائیگی / سیٹلمنٹ طریقہ',
  'client name': 'کسٹمر کا نام',
  'amount collected': 'وصول شدہ رقم',
  'received date': 'وصولی تاریخ',
  'no client invoice payment receipts documented in active logs.': 'کوئی وصولی رسید ریکارڈ نہیں ملا۔',
  'no client invoice payment receipts documented in active logs': 'کوئی وصولی رسید ریکارڈ نہیں ملا۔',

  // Sales Returns
  'sales returns & credit notes': 'سیلز واپسی اور کریڈٹ نوٹس',
  'manage customer return debit notes, stock reversals and settlement vouchers': 'کسٹمر واپسی، اسٹاک واپسی اور کریڈٹ نوٹس کا انتظام کریں',
  '+ add return note': '+ نئی واپسی درج کریں',
  'add return note +': '+ نئی واپسی درج کریں',
  'add return note': 'نئی واپسی درج کریں',
  'return note #': 'واپسی نوٹ #',
  'original invoice': 'اصل انوائس',
  'gate pass #': 'گیٹ پاس #',
  'return date': 'واپسی تاریخ',
  'return status': 'واپسی صورتحال',
  'total net amount': 'کل خالص رقم',
  'no return records found.': 'کوئی سیلز واپسی ریکارڈ نہیں ملا۔',
  'no return records found': 'کوئی سیلز واپسی ریکارڈ نہیں ملا۔',

  // Search Placeholders
  'search code, titles, controls...': 'کوڈ، عنوان یا کنٹرول تلاش کریں...',
  'search code, titles, controls': 'کوڈ، عنوان یا کنٹرول تلاش کریں...',
  'search by receipt no, customer...': 'رسید نمبر یا کسٹمر سے تلاش کریں...',
  '...search by receipt no, customer': 'رسید نمبر یا کسٹمر سے تلاش کریں...',
  'search return #, customer, invoice...': 'واپسی نمبر، کسٹمر یا انوائس سے تلاش کریں...',
  '...search return #, customer, invoice': 'واپسی نمبر، کسٹمر یا انوائس سے تلاش کریں...',

    'general ledger financial vouchers': 'جنرل لیجر مالیاتی واؤچرز',
    'no matching employee records found.': 'کوئی ملازم ریکارڈ نہیں ملا۔',
    'no matching employee records found': 'کوئی ملازم ریکارڈ نہیں ملا۔',
    'no upload batches recorded under any catalog.': 'کوئی اپلوڈ بیچ ریکارڈ موجود نہیں ہے۔',
    'no upload batches recorded under any catalog': 'کوئی اپلوڈ بیچ ریکارڈ موجود نہیں ہے۔',
    'no invoice records found.': 'کوئی انوائس ریکارڈ نہیں ملا۔',
    'no invoice records found': 'کوئی انوائس ریکارڈ نہیں ملا۔',
    'no transaction voucher slips documented inside system history logs.': 'کوئی واؤچر ریکارڈ نہیں ملا۔',
    'no transaction voucher slips documented inside system history logs': 'کوئی واؤچر ریکارڈ نہیں ملا۔',

  // Top Nav & Brand
    'uzair jibran cloth': 'عزیر جبران کلوتھ',
    'uzair jibran': 'عزیر جبران',
    'cloth erp': 'کلوتھ ERP',
    'cloth retail & wholesale': 'کلوتھ ریٹیل اینڈ ہول سیل',
    'retail & wholesale': 'ریٹیل اینڈ ہول سیل',
    'super admin': 'سپر ایڈمن',
    'admin': 'ایڈمن',
    'cloud synced': 'کلاؤڈ سنکڈ',
    'enterprise secure': 'محفوظ کاروباری نظام',
    'hotline': 'ہاٹ لائن',
    'hotline:': 'ہاٹ لائن:',
    'whatsapp': 'واٹس ایپ',
    'company / organization': 'کمپنی / ادارہ',
    'portal active': 'پورٹل فعال',
    'new sale': 'نئی سیل',
    'new sale +': '+ نئی سیل',
    '+ new sale': '+ نئی سیل',

    // Main Sections
    'dashboard': 'ڈیش بورڈ',
    'administration': 'انتظامیہ',
    'registration': 'رجسٹریشن',
    'sales': 'سیلز (فروخت)',
    'purchase': 'پرچیز (خریداری)',
    'human resource': 'ہیومن ریسورس (HR)',
    'reports': 'رپورٹس',

    // Navigation Submenus
    'chart of account': 'چارٹ آف اکاؤنٹس',
    'vouchers': 'واؤچرز',
    'bank account': 'بینک اکاؤنٹس',
    'opening stock': 'ابتدائی اسٹاک',
    'categories': 'کیٹیگریز',
    'brands': 'برانڈز',
    'brand': 'برانڈز',
    'uoms': 'پیمائش کی اکائیاں',
    'products': 'پروڈکٹس (اشیاء)',
    'bulk upload': 'بلک اپلوڈ',
    'company': 'کمپنی',
    'quotations': 'کوٹیشنز',
    'invoice': 'انوائس / بل',
    'invoice receipt': 'انوائس وصولی رسید',
    'sales return': 'سیلز واپسی',
    'sales return receipt': 'سیلز واپسی رسید',
    'customers': 'کسٹمرز (گاہک)',
    'salesman': 'سیلزمین',
    'purchases': 'پرچیز آرڈرز',
    'goods receipt (grn)': 'مال وصولی رسید (GRN)',
    'purchase receipt': 'پرچیز رسید',
    'purchase return': 'خریداری واپسی',
    'purchase return receipt': 'واپسی رسید',
    'vendor': 'وینڈرز (سپلائر)',
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

    // Dashboard Cards
    'cash': 'نقد کیش',
    'bank balance': 'بینک بیلنس',
    'receivables': 'وصول طلب رقم',
    'stock assets': 'اسٹاک کے اثاثے',
    'this month': 'اس ماہ',
    'this month:': 'اس ماہ:',
    ':this month': 'اس ماہ:',
    "today's sale": 'آج کی سیلز',
    'this month sales': 'اس ماہ کی سیلز',
    'this month purchases': 'اس ماہ کی خریداری',
    'customer bill': 'کسٹمر بل',
    'buy new product': 'نیا مال خریدیں',
    'items list': 'اشیاء کی فہرست',
    'customer return': 'کسٹمر واپسی',
    'inventory audit': 'انوینٹری آڈٹ',
    'role dashboard preview:': 'ڈیش بورڈ پیش نظارہ:',
    ':role dashboard preview': 'ڈیش بورڈ پیش نظارہ:',
    'executive overview': 'مرکزی جائزہ',
    'salesman view': 'سیلزمین ویو',
    'warehouse': 'گودام',
    'executive management dashboard': 'انتظامی مینجمنٹ ڈیش بورڈ',
    'show operational ledgers & analytics': 'آپریشنل لیجرز اور تجزیات دکھائیں',
    'hide operational ledgers & analytics': 'آپریشنل لیجرز اور تجزیات چھپائیں',
    'live modules': 'فعال ماڈیولز',

    // Table Column Headers (TH)
    's#': 'نمبر شمار',
    's #': 'نمبر شمار',
    '#': 'نمبر شمار',
    'sr #': 'نمبر شمار',
    'sr no': 'نمبر شمار',
    'sr. no.': 'نمبر شمار',
    'sr.': 'نمبر شمار',
    'purchase no': 'پرچیز نمبر',
    'purchase no.': 'پرچیز نمبر',
    'purchase #': 'پرچیز نمبر',
    'vendor profile': 'وینڈر پروفائل',
    'vendor name': 'وینڈر کا نام',
    'wholesale vendor': 'ہول سیل وینڈر',
    'stock receiving location': 'مال وصولی گودام',
    'receiving location': 'وصولی گودام',
    'source warehouse': 'ارسال کنندہ گودام',
    'target warehouse': 'ہدف گودام',
    'warehouse name': 'گودام کا نام',
    'entry date': 'اندراج تاریخ',
    'purchase date': 'خریداری تاریخ',
    'invoice date': 'انوائس تاریخ',
    'date': 'تاریخ',
    'payment term': 'ادائیگی کی شرط',
    'payment terms': 'ادائیگی کی شرائط',
    'total bill': 'کل بل',
    'bill amount': 'بل رقم',
    'grand total': 'کل رقم',
    'total amount': 'کل رقم',
    'payment / due status': 'ادائیگی کی صورتحال',
    'payment status': 'ادائیگی صورتحال',
    'due status': 'واجب الادا صورتحال',
    'reimbursement status': 'رقم واپسی صورتحال',
    'refund status': 'ری فنڈ صورتحال',
    'gross return': 'کل واپسی رقم',
    'return amount': 'واپسی رقم',
    '# debit note': 'ڈیبٹ نوٹ #',
    'debit note #': 'ڈیبٹ نوٹ #',
    'debit note': 'ڈیبٹ نوٹ',
    '# employee': 'ملازم کوڈ #',
    'employee #': 'ملازم کوڈ #',
    'employee id': 'ملازم شناختی کوڈ',
    'name': 'نام',
    'employee name': 'ملازم کا نام',
    'customer name': 'گاہک کا نام',
    'account': 'کھاتہ کوڈ',
    'accounts': 'کھاتہ جات',
    'designation': 'عہدہ',
    'joined': 'شمولیت کی تاریخ',
    'joining date': 'شمولیت کی تاریخ',
    'status': 'صورتحال',
    'action': 'کارروائی',
    'actions': 'کارروائی',
    'tier / category': 'کیٹیگری',
    'tier': 'کیٹیگری',
    'category': 'کیٹیگری',
    'phone': 'فون نمبر',
    'phone number': 'فون نمبر',
    'mobile': 'موبائل نمبر',
    'city': 'شہر',
    'city *': 'شہر *',
    'city / area': 'شہر / علاقہ',
    'area': 'علاقہ',
    'opening bal.': 'ابتدائی بیلنس',
    'opening bal': 'ابتدائی بیلنس',
    'opening balance': 'ابتدائی بیلنس',
    'nature': 'نوعیت',
    'balance nature': 'بیلنس نوعیت',
    'balance nature:': 'بیلنس نوعیت:',
    'address': 'پتہ',
    'page #': 'صفحہ #',
    'qty': 'تعداد',
    'quantity': 'تعداد',
    'uom': 'پیمائش',
    'unit price': 'فی یونٹ قیمت',
    'price': 'قیمت',
    'rate': 'ریٹ',
    'sale price': 'سیل قیمت',
    'purchase price': 'خریداری قیمت',
    'current stock': 'موجودہ اسٹاک',
    'available stock': 'دستیاب اسٹاک',
    'total': 'ٹوٹل',
    'paid': 'ادا شدہ',
    'unpaid': 'غیر ادا شدہ',
    'partially paid': 'جزوی ادا شدہ',
    'on credit': 'ادھار پر',
    'active': 'فعال',
    'inactive': 'غیر فعال',
    'debit (dr)': 'ڈیبٹ (Dr)',
    'credit (cr)': 'کریڈٹ (Cr)',
    'debit': 'ڈیبٹ',
    'credit': 'کریڈٹ',
    'manager': 'منیجر',

    // Table Action Buttons
    '+ log new supply': '+ نیا مال درج کریں',
    'log new supply +': '+ نیا مال درج کریں',
    'log new supply': 'نیا مال درج کریں',
    '+ log new return note': '+ نئی خریداری واپسی درج کریں',
    'log new return note +': '+ نئی خریداری واپسی درج کریں',
    'log new return note': 'نئی خریداری واپسی درج کریں',
    '+ add new employee': '+ نیا ملازم شامل کریں',
    'add new employee +': '+ نیا ملازم شامل کریں',
    'add new employee': 'نیا ملازم شامل کریں',
    '+ add new customer': '+ نیا کسٹمر شامل کریں',
    'add new customer +': '+ نیا کسٹمر شامل کریں',
    'add new customer': 'نیا کسٹمر شامل کریں',
    '+ add new vendor': '+ نیا وینڈر شامل کریں',
    'add new vendor +': '+ نیا وینڈر شامل کریں',
    'add new vendor': 'نیا وینڈر شامل کریں',
    '+ add new product': '+ نیا آئٹم شامل کریں',
    'add new product +': '+ نیا آئٹم شامل کریں',
    'add new product': 'نیا آئٹم شامل کریں',
    '+ link account': '+ کھاتہ لنک کریں',
    'link account': 'کھاتہ لنک کریں',
    'upload excel': 'ایکسل فائل اپلوڈ',
    'download excel format': 'ایکسل فارمیٹ ڈاؤنلوڈ',
    'clear list': 'لسٹ صاف کریں',
    'import customers': 'کسٹمرز امپورٹ کریں',
    'cancel': 'منسوخ',
    'edit': 'ترمیم',
    'delete': 'حذف',
    'save': 'محفوظ کریں',
    'update': 'اپ ڈیٹ کریں',
    'submit': 'جمع کریں',

    // Table Controls
    'show': 'دکھائیں',
    'entries': 'ریکارڈز',
    'search:': 'تلاش:',
    ':search': 'تلاش:',
    'search': 'تلاش',
    'previous': 'پچھلا',
    'next': 'اگلا',

    // Page Titles & Descriptions
    'wholesale purchase log registry': 'ہول سیل خریداری رجسٹر (Purchases)',
    'manage inward vendor supply consignments and trace batch arrivals': 'سپلائرز سے مال کی آمد، کنسائنمنٹس اور بیجز کا انتظام کریں',
    'vendor purchase returns registry (debit notes)': 'وینڈر پرچیز واپسی رجسٹر (ڈیبٹ نوٹس)',
    'trace outbound product returns, debit notes, and warehouse shelf offsets': 'سپلائرز کو ناقص مال کی واپسی اور ڈیبٹ نوٹس کا مکمل ریکارڈ',
    'employee database': 'ملازمین کا ڈیٹابیس',
    'manage company employees, designations, joined dates, and assign chart of account ledger codes': 'کمپنی ملازمین، عہدے، شمولیت کی تاریخ اور چارٹ آف اکاؤنٹس لیجر کوڈز',
    'customer database': 'کسٹمر ڈائریکٹری',
    'manage customer directory and assign chart of account ledger codes': 'کسٹمر کھاتہ جات اور لیجر کوڈز کا انتظام کریں',

    // Empty Table Notices
    'no supply restock logs recorded yet.': 'ابھی تک خریداری کا کوئی لاگ درج نہیں ہوا۔',
    'no supply restock logs recorded yet': 'ابھی تک خریداری کا کوئی لاگ درج نہیں ہوا۔',
    '.no supply restock logs recorded yet': 'ابھی تک خریداری کا کوئی لاگ درج نہیں ہوا۔',
    'no outbound supply return records found.': 'خریداری واپسی کا کوئی ریکارڈ نہیں ملا۔',
    'no outbound supply return records found': 'خریداری واپسی کا کوئی ریکارڈ نہیں ملا۔',
    '.no outbound supply return records found': 'خریداری واپسی کا کوئی ریکارڈ نہیں ملا۔',
    'no records found.': 'کوئی ریکارڈ نہیں ملا۔',
    'no records found': 'کوئی ریکارڈ نہیں ملا۔',
    'no data available.': 'کوئی ڈیٹا دستیاب نہیں ہے۔',
    'no data available': 'کوئی ڈیٹا دستیاب نہیں ہے۔',

    // Search Placeholders
    'search by order # or vendor name...': 'آرڈر نمبر یا وینڈر کے نام سے تلاش کریں...',
    'search by order # or vendor name': 'آرڈر نمبر یا وینڈر کے نام سے تلاش کریں...',
    'search by return #, vendor, warehouse': 'واپسی نمبر، وینڈر یا گودام سے تلاش کریں...',
    'employee #, name, designation, phone': 'ملازم کوڈ، نام، عہدہ، فون سے تلاش کریں...',
    'search name, phone, city, area, acc': 'نام، فون، شہر، علاقہ سے تلاش کریں...',
}

// Global direct string translation helper
export const getUrduText = (str: string): string => {
  if (!str) return str;
  
  // Extract and preserve sort arrows: ↑, ↓, ▲, ▼, ⇅, ↕
  const arrowMatch = str.match(/[↑↓▲▼⇅↕]+/);
  const arrow = arrowMatch ? arrowMatch[0] : '';
  const cleanNoArrow = str.replace(/[↑↓▲▼⇅↕]/g, '').trim().toLowerCase();
  const clean = str.trim().toLowerCase();

  // Pattern: Page X of Y -> صفحہ X از Y
  const pageMatch = clean.match(/^page\s+(\d+)\s+of\s+(\d+)$/i);
  if (pageMatch) {
    return `صفحہ ${pageMatch[1]} از ${pageMatch[2]}`;
  }

  // Pattern: X Available -> X دستیاب
  const availMatch = clean.match(/^(\d+)\s+available$/i);
  if (availMatch) {
    return `${availMatch[1]} دستیاب`;
  }

  // Preserve leading emojis e.g. 🧾
  const emojiMatch = str.match(/^([^\w\s\u0600-\u06FF]+)\s*/);
  const emojiPrefix = emojiMatch ? `${emojiMatch[1]} ` : '';
  const cleanNoEmoji = emojiPrefix ? clean.substring(emojiMatch[0].length).trim() : clean;
  
  // Direct key lookup
  for (const [key, val] of Object.entries(TRANSLATIONS)) {
    if (key.toLowerCase() === clean || val.en.toLowerCase() === clean) {
      return val.ur;
    }
  }

  if (QUICK_MAP[clean]) return QUICK_MAP[clean];
  if (emojiPrefix && QUICK_MAP[cleanNoEmoji]) return `${emojiPrefix}${QUICK_MAP[cleanNoEmoji]}`;
  if (arrow && QUICK_MAP[cleanNoArrow]) return `${QUICK_MAP[cleanNoArrow]} ${arrow}`;

  // Check 580+ TH master translations directly
  if (TH_TRANSLATIONS[clean]) return TH_TRANSLATIONS[clean];
  if (emojiPrefix && TH_TRANSLATIONS[cleanNoEmoji]) return `${emojiPrefix}${TH_TRANSLATIONS[cleanNoEmoji]}`;
  if (arrow && TH_TRANSLATIONS[cleanNoArrow]) return `${TH_TRANSLATIONS[cleanNoArrow]} ${arrow}`;

  // Strip currency tags e.g. (PKR) or (Rs.)
  const cleanNoPkr = clean.replace(/\s*\(pkr\)/g, '').replace(/\s*\(rs\.\)/g, '').trim();
  if (TH_TRANSLATIONS[cleanNoPkr]) {
    const suffix = (clean.includes('(pkr)') || clean.includes('(rs.)')) ? ' (روپے)' : '';
    return `${TH_TRANSLATIONS[cleanNoPkr]}${suffix}`;
  }

  // Strip leading/trailing dots, hashes, colons, pluses, sort arrows, ellipsis
  const stripped = clean
    .replace(/^[.\s#+:–—\->←⇅▲▼↑↓/]+/, '')
    .replace(/[.\s#+:–—\->←⇅▲▼↑↓/]+$/, '')
    .trim();

  if (QUICK_MAP[stripped]) {
    if (clean.startsWith('#')) return `${QUICK_MAP[stripped]} #`;
    if (clean.startsWith('+') || clean.endsWith('+')) return `+ ${QUICK_MAP[stripped]}`;
    return QUICK_MAP[stripped];
  }

  if (TH_TRANSLATIONS[stripped]) {
    if (clean.startsWith('#')) return `${TH_TRANSLATIONS[stripped]} #`;
    if (clean.startsWith('+') || clean.endsWith('+')) return `+ ${TH_TRANSLATIONS[stripped]}`;
    return TH_TRANSLATIONS[stripped];
  }

  // Multi-word Token Fallback (ONLY for short compound headers <= 3 words where ALL words are recognized)
  const words = clean.split(/[\s/]+/);
  if (words.length > 1 && words.length <= 3) {
    const allWordsRecognized = words.every((w) => {
      const wClean = w.replace(/^[.\s#+:–—\->←⇅▲▼↑↓()]+/, '').replace(/[.\s#+:–—\->←⇅▲▼↑↓()]+$/, '').toLowerCase();
      return !!(TOKEN_TRANSLATIONS[wClean] || TH_TRANSLATIONS[wClean] || QUICK_MAP[wClean]);
    });

    if (allWordsRecognized) {
      const translatedWords = words.map((w) => {
        const wClean = w.replace(/^[.\s#+:–—\->←⇅▲▼↑↓()]+/, '').replace(/[.\s#+:–—\->←⇅▲▼↑↓()]+$/, '').toLowerCase();
        return TOKEN_TRANSLATIONS[wClean] || TH_TRANSLATIONS[wClean] || QUICK_MAP[wClean] || w;
      });
      return translatedWords.join(' ');
    }
  }

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

  // Automated DOM Translator for Table Headers, Action Buttons, Filter Controls, Page Titles
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const translateElements = () => {
      if (language !== 'ur') return;

      const isBusinessData = (text: string) => {
        if (!text) return true;
        // Pure numbers, currencies, phone numbers, codes, dates
        if (/^[\d,.\-+/()#\s:]+$/.test(text) && !/[a-zA-Z]/.test(text)) return true;
        if (/^Rs\.?\s*[\d,.]+/i.test(text)) return true;
        if (/^\+?92[\d\s-]+/.test(text)) return true;
        return false;
      };

      // 1. Table Headers (th) - translates text nodes while preserving sort arrows, svgs, and buttons!
      const thElements = document.querySelectorAll('th');
      thElements.forEach((th) => {
        if (th.querySelector('input[type="checkbox"], select')) return;

        const walker = document.createTreeWalker(th, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || /^[⇅▲▼↑↓\s]+$/.test(raw)) continue;

          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || th;
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 2. Form Labels (label) - translates field labels while preserving inputs/checkboxes inside label
      const labels = document.querySelectorAll('label');
      labels.forEach((lbl) => {
        const walker = document.createTreeWalker(lbl, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;

          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || lbl;
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 3. Action Buttons & Button Links
      const buttons = document.querySelectorAll('button, a.btn, a[role="button"]');
      buttons.forEach((btn) => {
        const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;

          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || (btn as HTMLElement);
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 4. Page Titles, Section Headings & Card Titles (h1 to h6)
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((h) => {
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;

          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || h;
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 5. Descriptive Subtitles (p) - Safe TreeWalker
      const descParas = document.querySelectorAll('p.text-xs, p.text-sm, p.text-gray-400, p.text-slate-400, p.text-gray-500');
      descParas.forEach((p) => {
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;

          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || p;
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 6. UI Badges, Filter Controls & Status Spans (NEVER touches td business data) - Safe TreeWalker
      const spans = document.querySelectorAll('span');
      spans.forEach((sp) => {
        if (sp.closest('td:not([colspan])') || sp.classList.contains('font-mono') || sp.hasAttribute('data-no-translate')) return;

        const walker = document.createTreeWalker(sp, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;

          const lower = raw.toLowerCase();
          if (
            lower === 'show' || lower === 'entries' || lower === 'search:' || lower === ':search' ||
            lower === 'active' || lower === 'inactive' || lower === 'paid' || lower === 'unpaid' ||
            lower === 'partially paid' || lower === 'pending' || lower === 'completed' || lower === 'draft' ||
            lower === 'on credit' || lower === 'cash' || lower === 'previous' || lower === 'next' ||
            TH_TRANSLATIONS[lower] || QUICK_MAP[lower]
          ) {
            const urdu = getUrduText(raw);
            if (urdu && urdu !== raw) {
              const parent = (node.parentElement as HTMLElement) || sp;
              if (!parent.getAttribute('data-en-text')) {
                parent.setAttribute('data-en-text', raw);
              }
              if (node.textContent?.trim() !== urdu) {
                node.textContent = node.textContent?.replace(raw, urdu) || urdu;
              }
            }
          }
        }
      });

      // 7. Select Dropdown Placeholder Options
      const options = document.querySelectorAll('select option');
      options.forEach((opt) => {
        const raw = opt.textContent?.trim();
        if (!raw || isBusinessData(raw)) return;

        const urdu = getUrduText(raw);
        if (urdu && urdu !== raw) {
          if (!opt.getAttribute('data-en-text')) {
            opt.setAttribute('data-en-text', raw);
          }
          if (opt.textContent?.trim() !== urdu) {
            opt.textContent = urdu;
          }
        }
      });

      // 8. Empty Table Notices (td with colSpan or italic or empty-state) - Safe TreeWalker
      const emptyTds = document.querySelectorAll('td[colspan], td.italic, .empty-state');
      emptyTds.forEach((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw || isBusinessData(raw)) continue;
          const clean = raw.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
          const urdu = getUrduText(raw) || getUrduText(clean);
          if (urdu && urdu !== raw) {
            const parent = (node.parentElement as HTMLElement) || (el as HTMLElement);
            if (!parent.getAttribute('data-en-text')) {
              parent.setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        }
      });

      // 9. Search Input Placeholders
      const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
      inputs.forEach((input) => {
        const ph = (input as HTMLInputElement).placeholder?.trim();
        if (!ph) return;
        const cleanPh = ph.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
        const urdu = getUrduText(ph) || getUrduText(cleanPh);
        if (urdu && urdu !== ph) {
          if (!input.getAttribute('data-en-placeholder')) {
            input.setAttribute('data-en-placeholder', ph);
          }
          if ((input as HTMLInputElement).placeholder !== urdu) {
            (input as HTMLInputElement).placeholder = urdu;
          }
        }
      });

      // 10. Universal Pagination Pattern Interceptor (Safe TreeWalker)
      const paginationNodes = document.querySelectorAll('div, span, p');
      paginationNodes.forEach((el) => {
        if (el.closest('table tbody, form, input, select')) return;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const raw = node.textContent?.trim();
          if (!raw) continue;

          // Pattern: Showing X to Y of Z entries
          const showingMatch = raw.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s*(?:stock\s*)?entries?/i);
          if (showingMatch) {
            const urdu = `کل ${showingMatch[3]} میں سے ${showingMatch[1]} تا ${showingMatch[2]} ریکارڈز`;
            if (node.textContent?.trim() !== urdu) {
              node.textContent = urdu;
            }
            continue;
          }

          // Pattern: Page X of Y
          const pageMatch = raw.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
          if (pageMatch) {
            const urdu = `صفحہ ${pageMatch[1]} از ${pageMatch[2]}`;
            if (node.textContent?.trim() !== urdu) {
              node.textContent = urdu;
            }
            continue;
          }
        }
      });
    };

    const restoreElements = () => {
      const translated = document.querySelectorAll('[data-en-text]');
      translated.forEach((el) => {
        const en = el.getAttribute('data-en-text');
        if (en) {
          el.textContent = en;
          el.removeAttribute('data-en-text');
        }
      });

      const translatedPlaceholders = document.querySelectorAll('[data-en-placeholder]');
      translatedPlaceholders.forEach((input) => {
        const en = input.getAttribute('data-en-placeholder');
        if (en) {
          (input as HTMLInputElement).placeholder = en;
          input.removeAttribute('data-en-placeholder');
        }
      });
    };

    if (language === 'ur') {
      translateElements();

      let frameId: number | null = null;
      const observer = new MutationObserver(() => {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          translateElements();
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
      });

      return () => {
        if (frameId) cancelAnimationFrame(frameId);
        observer.disconnect();
      };
    } else {
      restoreElements();
    }
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
