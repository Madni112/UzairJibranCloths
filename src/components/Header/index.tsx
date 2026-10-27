import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DropdownUser from './DropdownUser';
import DarkModeSwitcher from './DarkModeSwitcher';
import NotificationDropdown from './NotificationDropdown';
import { MdMenu } from 'react-icons/md';
import {
  LuSearch,
  LuPlus,
  LuClock,
  LuVolume2,
  LuVolumeX,
  LuCommand,
  LuArrowRight,
  LuX,
  LuFileText,
  LuReceipt,
  LuUsers,
  LuPackage,
  LuSlidersHorizontal,
  LuBarChart3,
  LuShield,
  LuBuilding2,
  LuRefreshCw,
  LuSparkles,
} from 'react-icons/lu';
import { useAuth } from '../../Context/Auth';
import { getBrandConfig } from '../../utils/brand';
import { supabase } from '../../Context/supabaseClient';
import {
  isUserAudioEnabled,
  setUserAudioEnabled,
  triggerFeedbackSound,
} from '../../utils/audioFeedback';
import {
  NavbarLayoutMode,
  getNavbarLayoutMode,
  getSavedSidebarColor,
  getContrastTextColor,
} from '../../constant/themeConfig';

export interface GlobalSearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Invoices' | 'Customers' | 'Products' | 'Vendors' | 'Pages';
  path: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
}

const NAVIGATION_REGISTRY: GlobalSearchItem[] = [
  // Sales & Billing
  { id: 'nav-new-inv', title: 'New Sales Invoice', subtitle: 'Create POS sale or delivery challan', category: 'Pages', path: '/sales/invoice/add', icon: <LuPlus /> },
  { id: 'nav-inv-dir', title: 'Sales Invoices Directory', subtitle: 'View past invoices, DC history & receipts', category: 'Pages', path: '/Sales/Invoice/List', icon: <LuReceipt /> },
  { id: 'nav-returns', title: 'Sales Return & Exchange', subtitle: 'Process return items and customer refunds', category: 'Pages', path: '/Sales/Sales-Return/List', icon: <LuFileText /> },
  { id: 'nav-quotes', title: 'Quotations & Estimates', subtitle: 'Draft and print pricing estimates', category: 'Pages', path: '/crm/quotations', icon: <LuFileText /> },

  // Inventory & Products
  { id: 'nav-prods', title: 'Product Catalog & Inventory', subtitle: 'Stock balances, tile sizing & prices', category: 'Pages', path: '/Administration/Products/List', icon: <LuPackage /> },
  { id: 'nav-bulk', title: 'Bulk Products Upload', subtitle: 'Upload products via Excel spreadsheet', category: 'Pages', path: '/Administration/Products/Bulk-Upload', icon: <LuPlus /> },

  // Contacts & Ledgers
  { id: 'nav-custs', title: 'Customer Directory & Accounts', subtitle: 'Customer ledgers, phone & credit limits', category: 'Pages', path: '/Sales/Customers/List', icon: <LuUsers /> },
  { id: 'nav-vends', title: 'Vendor & Supplier Accounts', subtitle: 'Vendor ledgers and payable bills', category: 'Pages', path: '/Purchase/Vendor/List', icon: <LuBuilding2 /> },
  { id: 'nav-purchases', title: 'Purchase Orders & GRN', subtitle: 'Purchases, stock intake & vendor bills', category: 'Pages', path: '/Purchase/Purchases/List', icon: <LuPackage /> },
  { id: 'nav-vouchers', title: 'Cash & Bank Vouchers', subtitle: 'Receipts, payment vouchers & ledgers', category: 'Pages', path: '/Registration/Vouchers/List', icon: <LuReceipt /> },

  // Preferences & System
  { id: 'nav-settings-dev', title: 'Login Devices & Security', subtitle: 'Manage active workstations & remote logout', category: 'Pages', path: '/settings', icon: <LuShield /> },
  { id: 'nav-settings-credit', title: 'Customer Credit Limits', subtitle: 'Set borrowing ceilings & check risk', category: 'Pages', path: '/settings', icon: <LuSlidersHorizontal /> },
  { id: 'nav-settings-audio', title: 'Audio & Sound Effects', subtitle: 'Customize POS ringtones & volume', category: 'Pages', path: '/settings', icon: <LuVolume2 /> },
  { id: 'nav-settings-backup', title: 'Data Backup & Export', subtitle: 'Export Excel snapshots & database backups', category: 'Pages', path: '/settings', icon: <LuSlidersHorizontal /> },
  { id: 'nav-settings-theme', title: 'Theme & Brand Appearance', subtitle: 'Accent colors, dark mode & styles', category: 'Pages', path: '/settings', icon: <LuSlidersHorizontal /> },
  { id: 'nav-dev-master', title: 'Developer Master Console', subtitle: 'Apex security governance & user tools', category: 'Pages', path: '/dev/master', icon: <LuShield /> },
];

type CategoryFilter = 'ALL' | 'INVOICES' | 'CUSTOMERS' | 'PRODUCTS' | 'VENDORS' | 'PAGES';

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { userEmail, userLocationName } = useAuth();

  // 1. Live Digital Clock State
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setDateString(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  // 2. Audio Mute / Active Fast Switch
  const [audioActive, setAudioActive] = useState<boolean>(() =>
    isUserAudioEnabled(userEmail)
  );

  useEffect(() => {
    const handleAudioPrefChange = () => {
      setAudioActive(isUserAudioEnabled(userEmail));
    };
    window.addEventListener('erp_audio_preference_changed', handleAudioPrefChange);
    return () => window.removeEventListener('erp_audio_preference_changed', handleAudioPrefChange);
  }, [userEmail]);

  const toggleSound = () => {
    const nextState = !audioActive;
    setAudioActive(nextState);
    setUserAudioEnabled(nextState, userEmail);
    if (nextState) {
      triggerFeedbackSound('notification', userEmail);
    }
  };

  // 3. Dynamic Sidebar Color (for cohesive New Sale button styling)
  const [sidebarColor, setSidebarColor] = useState<string>(getSavedSidebarColor());

  useEffect(() => {
    const handleSidebarColorChange = () => {
      setSidebarColor(getSavedSidebarColor());
    };
    window.addEventListener('uzair_jibran_sidebar_color_changed', handleSidebarColorChange);
    return () => window.removeEventListener('uzair_jibran_sidebar_color_changed', handleSidebarColorChange);
  }, []);

  // 4. Navbar Layout Mode (Floating Modern vs Classic Edge)
  const [navbarMode, setNavbarMode] = useState<NavbarLayoutMode>(getNavbarLayoutMode());

  useEffect(() => {
    const updateNavbarMode = () => {
      setNavbarMode(getNavbarLayoutMode());
    };
    window.addEventListener('uzair_jibran_navbar_layout_changed', updateNavbarMode);
    window.addEventListener('storage', updateNavbarMode);
    return () => {
      window.removeEventListener('uzair_jibran_navbar_layout_changed', updateNavbarMode);
      window.removeEventListener('storage', updateNavbarMode);
    };
  }, []);

  // 4. Command Palette / Live Global Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<CategoryFilter>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbItems, setDbItems] = useState<GlobalSearchItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
      setSelectedIndex(0);
    } else {
      setSearchQuery('');
      setDbItems([]);
      setSearchFilter('ALL');
    }
  }, [searchOpen]);

  // Live Database Queries across Invoices, Customers, Products, Vendors
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setDbItems([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const cleanQ = query.replace(/[%_,]/g, ' ');

    const timer = setTimeout(async () => {
      try {
        const [invRes, custRes, prodRes, vendRes] = await Promise.allSettled([
          // 1. Invoices
          supabase
            .from('sales_invoices')
            .select('*')
            .or(`invoice_no.ilike.%${cleanQ}%,customer_name.ilike.%${cleanQ}%`)
            .order('id', { ascending: false })
            .limit(5),

          // 2. Customers
          supabase
            .from('customers')
            .select('*')
            .or(`customerName.ilike.%${cleanQ}%,phoneNumber.ilike.%${cleanQ}%,account_code.ilike.%${cleanQ}%`)
            .order('id', { ascending: false })
            .limit(5),

          // 3. Products
          supabase
            .from('products')
            .select('*')
            .or(`product_name.ilike.%${cleanQ}%,item_sr_no.ilike.%${cleanQ}%,category.ilike.%${cleanQ}%`)
            .order('id', { ascending: false })
            .limit(5),

          // 4. Vendors
          supabase
            .from('vendors')
            .select('*')
            .or(`vendor_name.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%,phoneNumber.ilike.%${cleanQ}%`)
            .order('id', { ascending: false })
            .limit(5),
        ]);

        const liveResults: GlobalSearchItem[] = [];

        // Parse Invoices
        if (invRes.status === 'fulfilled' && Array.isArray(invRes.value.data)) {
          invRes.value.data.forEach((inv: any) => {
            const total = Number(inv.total_amount || 0);
            liveResults.push({
              id: `inv-${inv.id}`,
              title: `Invoice #${inv.invoice_no || inv.id}`,
              subtitle: `${inv.customer_name || 'Walk-in Customer'} • ${
                inv.date ? new Date(inv.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
              }`,
              category: 'Invoices',
              badge: `Rs. ${total.toLocaleString()}`,
              badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
              path: `/Sales/Invoice/edit/${inv.id}`,
              icon: <LuReceipt className="text-emerald-500" />,
            });
          });
        }

        // Parse Customers
        if (custRes.status === 'fulfilled' && Array.isArray(custRes.value.data)) {
          custRes.value.data.forEach((c: any) => {
            liveResults.push({
              id: `cust-${c.id}`,
              title: c.customerName || 'Customer',
              subtitle: `${c.phoneNumber || 'No phone'} ${c.city ? '• ' + c.city : ''} ${c.account_code ? '• Code: ' + c.account_code : ''}`,
              category: 'Customers',
              badge: 'Customer',
              badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
              path: '/Sales/Customers/List',
              icon: <LuUsers className="text-blue-500" />,
            });
          });
        }

        // Parse Products
        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)) {
          prodRes.value.data.forEach((p: any) => {
            const price = Number(p.sales_price || p.retail_price || p.price || 0);
            liveResults.push({
              id: `prod-${p.id}`,
              title: p.product_name || p.name || 'Product',
              subtitle: `${p.category ? p.category + ' • ' : ''}${p.item_sr_no ? 'SKU: ' + p.item_sr_no : ''} ${
                p.current_stock !== undefined ? '• Stock: ' + p.current_stock : ''
              }`,
              category: 'Products',
              badge: price > 0 ? `Rs. ${price.toLocaleString()}` : 'Product',
              badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
              path: '/Administration/Products/List',
              icon: <LuPackage className="text-amber-500" />,
            });
          });
        }

        // Parse Vendors
        if (vendRes.status === 'fulfilled' && Array.isArray(vendRes.value.data)) {
          vendRes.value.data.forEach((v: any) => {
            liveResults.push({
              id: `vend-${v.id}`,
              title: v.vendor_name || v.name || 'Vendor',
              subtitle: `${v.phoneNumber || v.phone || 'Supplier'} ${v.contact_person ? '• ' + v.contact_person : ''}`,
              category: 'Vendors',
              badge: 'Supplier',
              badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
              path: '/Purchase/Vendor/List',
              icon: <LuBuilding2 className="text-purple-500" />,
            });
          });
        }

        setDbItems(liveResults);
      } catch (err) {
        console.error('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combine static navigation with live database search items
  const allCombinedItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return NAVIGATION_REGISTRY;
    }

    const matchingNav = NAVIGATION_REGISTRY.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );

    return [...dbItems, ...matchingNav];
  }, [searchQuery, dbItems]);

  // Filter by category pill tab
  const filteredItems = useMemo(() => {
    if (searchFilter === 'ALL') return allCombinedItems;
    const catMap: Record<CategoryFilter, string> = {
      ALL: 'All',
      INVOICES: 'Invoices',
      CUSTOMERS: 'Customers',
      PRODUCTS: 'Products',
      VENDORS: 'Vendors',
      PAGES: 'Pages',
    };
    return allCombinedItems.filter((it) => it.category === catMap[searchFilter]);
  }, [allCombinedItems, searchFilter]);

  const handleSelectSearchItem = (path: string) => {
    setSearchOpen(false);
    navigate(path);
  };

  // Keyboard Navigation inside Modal
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectSearchItem(filteredItems[selectedIndex].path);
      }
    }
  };

  // Dynamic Portal Identifier
  const brand = getBrandConfig();
  const portalCode = brand.code;
  const branchLabel = userLocationName || 'Portal Active';

  return (
    <>
      <header
        className={`shrink-0 z-40 flex duration-200 ease-in-out transition-all ${
          navbarMode === 'classic'
            ? 'w-full rounded-none border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl bg-white/90 dark:bg-[#0B0F17]/90 shadow-2xs'
            : 'w-auto min-[751px]:mx-3.5 min-[751px]:mt-3.5 rounded-none min-[751px]:rounded-2xl border-b min-[751px]:border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl bg-white/95 dark:bg-[#111827]/95 shadow-xs min-[751px]:shadow-md'
        }`}
      >
        <div className="flex flex-grow items-center justify-between px-3 py-2 sm:px-4 2xl:px-6 gap-2 sm:gap-3 w-full min-w-0">
          
          {/* Left Side: Mobile Menu + Portal/Branch Pill + New Sale Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile Sidebar Toggle */}
            <button
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation();
                props.setSidebarOpen(!props.sidebarOpen);
              }}
              className="z-99999 block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-2xs min-[751px]:hidden text-slate-700 dark:text-slate-200 hover:text-primary transition cursor-pointer"
            >
              <MdMenu size={20} />
            </button>

            {/* Dynamic Portal & Branch Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-2xs shrink-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider">
                {portalCode}
              </span>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[90px] xl:max-w-[130px]">
                {branchLabel}
              </span>
            </div>

            {/* Quick Action: New Sale Button (Harmonized with Sidebar Color) */}
            <Link
              to="/sales/invoice/add"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0 border border-black/10 dark:border-white/10"
              style={{
                backgroundColor: sidebarColor,
                color: getContrastTextColor(sidebarColor),
              }}
              title="Create a New Sales Invoice"
            >
              <LuPlus className="text-sm stroke-[3]" />
              <span className="hidden md:inline">New Sale</span>
            </Link>
          </div>

          {/* Center: Command Palette / Quick Search Trigger */}
          <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-1 sm:mx-2 hidden md:block min-w-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition text-xs cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <LuSearch className="text-sm text-slate-400 shrink-0" />
                <span className="truncate">Search invoices, customers, products...</span>
              </div>
              <kbd className="hidden 2xl:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 shadow-2xs shrink-0">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            </button>
          </div>

          {/* Right Side: Tools & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition md:hidden cursor-pointer"
              title="Quick Search (Ctrl + K)"
            >
              <LuSearch size={18} />
            </button>

            {/* Live Clock (Only time on xl, full date on 2xl) */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              <LuClock className="text-xs text-primary shrink-0" />
              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">
                {timeString}
              </span>
              <span className="hidden 2xl:inline text-[10px] text-slate-400">•</span>
              <span className="hidden 2xl:inline text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {dateString}
              </span>
            </div>

            {/* Fast Sound Mute / Unmute Button */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1.5 sm:p-2 rounded-full border transition flex items-center justify-center cursor-pointer shadow-2xs shrink-0 ${
                audioActive
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={audioActive ? 'POS Sound Effects: ON (Click to Mute)' : 'POS Sound Effects: MUTED (Click to Turn On)'}
            >
              {audioActive ? <LuVolume2 size={16} /> : <LuVolumeX size={16} />}
            </button>

            {/* Header Notifications Dropdown */}
            <NotificationDropdown />

            {/* Dark Mode Switcher */}
            <DarkModeSwitcher />

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

            {/* User Profile Dropdown */}
            <DropdownUser />
          </div>
        </div>
      </header>

      {/* ── COMMAND PALETTE / LIVE SPOTLIGHT GLOBAL SEARCH (Ctrl + K) ── */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-99999 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden transition-all flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <LuSearch className="text-lg text-primary shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onKeyDown={handleInputKeyDown}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search live invoices, customers, products, vendors, or tools..."
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
              />
              {isSearching ? (
                <LuRefreshCw className="animate-spin text-primary text-sm shrink-0" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <LuX size={16} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Ctrl K
                </kbd>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 overflow-x-auto text-xs shrink-0">
              {(
                [
                  { id: 'ALL', label: 'All Results' },
                  { id: 'INVOICES', label: 'Invoices' },
                  { id: 'CUSTOMERS', label: 'Customers' },
                  { id: 'PRODUCTS', label: 'Products' },
                  { id: 'VENDORS', label: 'Vendors' },
                  { id: 'PAGES', label: 'Pages' },
                ] as { id: CategoryFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSearchFilter(tab.id);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                    searchFilter === tab.id
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results Header Label */}
            <div className="px-4 py-1.5 bg-slate-50/40 dark:bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100/60 dark:border-slate-800/60 shrink-0">
              <span>
                {searchQuery.trim().length >= 2
                  ? `Live Results for "${searchQuery}" (${filteredItems.length})`
                  : 'Quick Navigation & Shortcuts'}
              </span>
              {searchQuery.trim().length >= 2 && dbItems.length > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <LuSparkles size={11} /> Live Cloud Synced
                </span>
              )}
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <LuSearch className="mx-auto text-3xl text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No matching records found for "{searchQuery}".
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Try searching by customer phone number, invoice number, SKU code, or vendor name.
                  </p>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchItem(item.path)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                            isSelected
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border shrink-0 ${
                                  item.badgeColor ||
                                  'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          {item.category}
                        </span>
                        <LuArrowRight
                          className={`transition shrink-0 ${
                            isSelected
                              ? 'text-primary translate-x-0.5'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                          size={14}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Hotkeys */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span>
                  Select with <kbd className="px-1 rounded-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">↵ Enter</kbd>
                </span>
                <span>
                  Navigate with <kbd className="px-1 rounded-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">↑</kbd> <kbd className="px-1 rounded-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">↓</kbd>
                </span>
              </div>
              <span>
                Close with <kbd className="px-1 rounded-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">Esc</kbd>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;