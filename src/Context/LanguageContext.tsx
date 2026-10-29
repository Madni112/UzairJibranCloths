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
export const getUrduText = (str: string): string => {
  if (!str) return str;
  const clean = str.trim().toLowerCase();
  
  // Direct key lookup
  for (const [key, val] of Object.entries(TRANSLATIONS)) {
    if (key.toLowerCase() === clean || val.en.toLowerCase() === clean) {
      return val.ur;
    }
  }

  // Common quick replacements & master lookup
  const quickMap: Record<string, string> = {
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
    'chart of accounts': 'چارٹ آف اکاؤنٹس',
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
    'return date': 'واپسی تاریخ',
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
    'account code': 'کھاتہ کوڈ',
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
  };

  if (quickMap[clean]) return quickMap[clean];

  // Check 580+ TH master translations directly
  if (TH_TRANSLATIONS[clean]) return TH_TRANSLATIONS[clean];

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

  if (quickMap[stripped]) {
    if (clean.startsWith('#')) return `${quickMap[stripped]} #`;
    if (clean.startsWith('+') || clean.endsWith('+')) return `+ ${quickMap[stripped]}`;
    return quickMap[stripped];
  }

  if (TH_TRANSLATIONS[stripped]) {
    if (clean.startsWith('#')) return `${TH_TRANSLATIONS[stripped]} #`;
    if (clean.startsWith('+') || clean.endsWith('+')) return `+ ${TH_TRANSLATIONS[stripped]}`;
    return TH_TRANSLATIONS[stripped];
  }

  // Multi-word Token Fallback (translates compound headers)
  const words = clean.split(/[\s/]+/);
  if (words.length > 1) {
    let hasTranslated = false;
    const translatedWords = words.map((w) => {
      const wClean = w.replace(/^[.\s#+:–—\->←⇅▲▼↑↓()]+/, '').replace(/[.\s#+:–—\->←⇅▲▼↑↓()]+$/, '').toLowerCase();
      if (TOKEN_TRANSLATIONS[wClean]) {
        hasTranslated = true;
        return TOKEN_TRANSLATIONS[wClean];
      }
      if (TH_TRANSLATIONS[wClean]) {
        hasTranslated = true;
        return TH_TRANSLATIONS[wClean];
      }
      return w;
    });

    if (hasTranslated) {
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

      // 1. Table Headers (th) - translates text nodes while preserving sort arrows, svgs, and buttons!
      const thElements = document.querySelectorAll('th');
      thElements.forEach((th) => {
        // Skip if th contains form inputs
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

      // 2. Action Buttons
      const buttons = document.querySelectorAll('button, a.btn');
      buttons.forEach((btn) => {
        const textNodes = Array.from(btn.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
        textNodes.forEach((node) => {
          const raw = node.textContent?.trim();
          if (!raw) return;
          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            if (!(btn as HTMLElement).getAttribute('data-en-text')) {
              (btn as HTMLElement).setAttribute('data-en-text', raw);
            }
            if (node.textContent?.trim() !== urdu) {
              node.textContent = node.textContent?.replace(raw, urdu) || urdu;
            }
          }
        });
      });

      // 3. Search and pagination labels (e.g. "Show", "entries", "Search:")
      const labels = document.querySelectorAll('span, label');
      labels.forEach((el) => {
        const raw = el.textContent?.trim();
        if (!raw) return;
        const lower = raw.toLowerCase();
        if (lower === 'show' || lower === 'entries' || lower === 'search:' || lower === ':search') {
          const urdu = getUrduText(raw);
          if (urdu && urdu !== raw) {
            if (!el.getAttribute('data-en-text')) {
              el.setAttribute('data-en-text', raw);
            }
            if (el.textContent?.trim() !== urdu) {
              el.textContent = urdu;
            }
          }
        }
      });

      // 4. Page Titles & Subtitles (h2, h3, h1, descriptions)
      const headings = document.querySelectorAll('h2, h3, h1, p.text-gray-400, p.text-gray-500, p.text-slate-400, p.text-slate-500');
      headings.forEach((el) => {
        const raw = el.textContent?.trim();
        if (!raw) return;
        const urdu = getUrduText(raw);
        if (urdu && urdu !== raw) {
          if (!el.getAttribute('data-en-text')) {
            el.setAttribute('data-en-text', raw);
          }
          if (el.textContent?.trim() !== urdu) {
            el.textContent = urdu;
          }
        }
      });

      // 5. Empty Table Notices (td with colSpan or italic)
      const emptyTds = document.querySelectorAll('td[colspan], td.italic');
      emptyTds.forEach((el) => {
        const raw = el.textContent?.trim();
        if (!raw) return;
        const clean = raw.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
        if (
          clean.toLowerCase().includes('no supply restock') ||
          clean.toLowerCase().includes('no outbound supply') ||
          clean.toLowerCase().includes('no records found') ||
          clean.toLowerCase().includes('no data')
        ) {
          const urdu = getUrduText(raw) || getUrduText(clean);
          if (urdu && urdu !== raw) {
            if (!el.getAttribute('data-en-text')) {
              el.setAttribute('data-en-text', raw);
            }
            if (el.textContent?.trim() !== urdu) {
              el.textContent = urdu;
            }
          }
        }
      });

      // 6. Common Search Input Placeholders
      const inputs = document.querySelectorAll('input[type="text"]');
      inputs.forEach((input) => {
        const ph = (input as HTMLInputElement).placeholder?.trim();
        if (!ph) return;
        const urdu = getUrduText(ph);
        if (urdu && urdu !== ph) {
          if (!input.getAttribute('data-en-placeholder')) {
            input.setAttribute('data-en-placeholder', ph);
          }
          if ((input as HTMLInputElement).placeholder !== urdu) {
            (input as HTMLInputElement).placeholder = urdu;
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
