import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Barcode from 'react-barcode';
import {
  LuStore,
  LuPackage,
  LuTruck,
  LuSearch,
  LuPlus,
  LuMinus,
  LuTrash2,
  LuCreditCard,
  LuBanknote,
  LuQrCode,
  LuReceipt,
  LuClock,
  LuUser,
  LuLock,
  LuUnlock,
  LuPrinter,
  LuLayers,
  LuArrowLeft,
  LuCheck,
  LuArrowRightLeft,
  LuX,
  LuPercent,
  LuTag,
  LuShoppingBag,
  LuChevronDown,
  LuVolume2,
  LuVolumeX,
  LuSun,
  LuMoon,
  LuPauseCircle,
  LuRotateCcw,
  LuFileText,
  LuShieldCheck,
  LuCoins,
  LuArrowDownLeft,
  LuArrowUpRight,
  LuHelpCircle,
  LuSparkles,
  LuCalendar,
  LuCheckCircle2,
  LuBarChart3,
  LuSettings,
  LuLogOut,
  LuAlertTriangle,
  LuHistory
} from 'react-icons/lu';
import { MdPointOfSale } from 'react-icons/md';
import { IoBarcodeOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useAuth } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';
import useColorMode from '../../hooks/useColorMode';
import ClickOutside from '../../components/ClickOutside';
import { POSSettingsTab } from '../Settings/POSSettingsTab';
import {
  getSavedAccentColor,
  getContrastTextColor,
  getSafeAccentTextColor,
  isDarkModeActive
} from '../../constant/themeConfig';
import { triggerFeedbackSound } from '../../utils/audioFeedback';
import POSCatalog from './POSCatalog';
import POSOrders from './POSOrders';
import POSRegister from './POSRegister';
import {
  posService,
  PosOrder,
  POSPaymentAccount,
  PosOrderItem,
  PosProductItem,
  PosCategoryItem,
  PosHeldOrder,
  PosShift,
  PosSettings
} from '../../service/posService';

// ── SWIPEABLE HELD ORDER CARD COMPONENT ──
interface SwipeableHeldOrderCardProps {
  order: PosHeldOrder;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onResume: (order: PosHeldOrder) => void;
  onDelete: (order: PosHeldOrder) => void;
  isSwiped: boolean;
  onSwipeChange: (id: string, swiped: boolean) => void;
}

const SwipeableHeldOrderCard: React.FC<SwipeableHeldOrderCardProps> = ({
  order,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onResume,
  onDelete,
  isSwiped,
  onSwipeChange
}) => {
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = React.useRef<number>(0);
  const startYRef = React.useRef<number>(0);
  const movedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (isSwiped && !isSelectMode) {
      setOffsetX(-90);
    } else {
      setOffsetX(0);
    }
  }, [isSwiped, isSelectMode]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectMode) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    movedRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSelectMode) return;
    const diffX = e.touches[0].clientX - startXRef.current;
    const diffY = e.touches[0].clientY - startYRef.current;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 6) movedRef.current = true;
      if (isSwiped) {
        const val = Math.min(0, Math.max(-90, -90 + diffX));
        setOffsetX(val);
      } else {
        if (diffX < 0) {
          setOffsetX(Math.max(-90, diffX));
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSelectMode) return;
    setIsDragging(false);
    if (isSwiped) {
      if (offsetX > -45) {
        setOffsetX(0);
        onSwipeChange(order.id, false);
      } else {
        setOffsetX(-90);
      }
    } else {
      if (offsetX < -35) {
        setOffsetX(-90);
        onSwipeChange(order.id, true);
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSelectMode) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    movedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelectMode || !isDragging) return;
    const diffX = e.clientX - startXRef.current;
    if (Math.abs(diffX) > 6) movedRef.current = true;
    if (isSwiped) {
      const val = Math.min(0, Math.max(-90, -90 + diffX));
      setOffsetX(val);
    } else {
      if (diffX < 0) {
        setOffsetX(Math.max(-90, diffX));
      }
    }
  };

  const handleMouseUp = () => {
    if (isSelectMode || !isDragging) return;
    setIsDragging(false);
    if (isSwiped) {
      if (offsetX > -45) {
        setOffsetX(0);
        onSwipeChange(order.id, false);
      } else {
        setOffsetX(-90);
      }
    } else {
      if (offsetX < -35) {
        setOffsetX(-90);
        onSwipeChange(order.id, true);
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleMouseLeave = () => {
    if (isSelectMode || !isDragging) return;
    setIsDragging(false);
    if (offsetX < -35) {
      setOffsetX(-90);
      onSwipeChange(order.id, true);
    } else {
      setOffsetX(isSwiped ? -90 : 0);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const orderId = order.id || order.order_number || order.ticket_number || '';
    if (isSelectMode) {
      onToggleSelect(orderId);
      return;
    }
    if (movedRef.current || Math.abs(offsetX) > 8) {
      return;
    }
    if (isSwiped) {
      onSwipeChange(orderId, false);
      return;
    }
    onResume(order);
  };

  const displayOrderNumber = order.order_number || order.ticket_number || 'Order';

  return (
    <div className="relative overflow-hidden rounded-2xl select-none group">
      {/* Background Revealed on Swipe Left: Red Delete Button (normal mode only) */}
      {!isSelectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onDelete(order);
          }}
          className="absolute inset-y-0 right-0 w-[90px] bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1.5 cursor-pointer transition active:bg-rose-800 z-0 rounded-r-2xl font-bold shadow-inner"
          title="Delete this held order"
        >
          <LuTrash2 size={22} className="animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold">Delete</span>
        </div>
      )}

      {/* Foreground Sliding Order Card */}
      <div
        style={{
          transform: isSelectMode ? 'none' : `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onTouchStart={!isSelectMode ? handleTouchStart : undefined}
        onTouchMove={!isSelectMode ? handleTouchMove : undefined}
        onTouchEnd={!isSelectMode ? handleTouchEnd : undefined}
        onMouseDown={!isSelectMode ? handleMouseDown : undefined}
        onMouseMove={!isSelectMode ? handleMouseMove : undefined}
        onMouseUp={!isSelectMode ? handleMouseUp : undefined}
        onMouseLeave={!isSelectMode ? handleMouseLeave : undefined}
        onClick={handleCardClick}
        className={`relative z-10 p-4 rounded-2xl bg-white dark:bg-[#161D2B] border transition-all duration-150 shadow-xs space-y-2.5 cursor-pointer active:scale-[0.99] ${
          isSelectMode && isSelected
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/40 bg-primary/5 dark:bg-primary/10'
            : isSelectMode
            ? 'border-slate-200 dark:border-slate-800/90 hover:border-primary/50'
            : 'border-slate-200 dark:border-slate-800/90 hover:border-emerald-500/60 hover:shadow-md'
        }`}
      >
        {/* Top Row: Tickmark (only in select mode), Order ID, Fulfillment, Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Tickmark / Checkbox ONLY in select mode */}
            {isSelectMode && (
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                  isSelected
                    ? 'bg-primary border-primary text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                {isSelected && <LuCheck size={13} className="stroke-[3]" />}
              </div>
            )}

            <span className="font-mono font-black text-xs text-slate-900 dark:text-white truncate">
              {displayOrderNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] shrink-0">
            {order.fulfillment_type && (
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {order.fulfillment_type}
              </span>
            )}
            <span className="text-slate-400 font-medium">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Note / Tag */}
        {order.note && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/40 px-2.5 py-1 rounded-xl">
            <LuTag size={12} className="shrink-0" />
            <span className="font-semibold">{order.note}</span>
          </div>
        )}

        {/* Customer & Items Meta */}
        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span className="font-bold truncate max-w-[200px]">
            {order.customer_name || 'Walk-in Customer'}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Items Preview Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {order.items?.slice(0, 4).map((it, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[130px] shrink-0"
              title={it.product_name}
            >
              <span className="font-bold text-slate-900 dark:text-white">{it.quantity}x</span>
              <span className="truncate">{it.product_name}</span>
            </div>
          ))}
          {(order.items?.length || 0) > 4 && (
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              +{(order.items?.length || 0) - 4} more
            </span>
          )}
        </div>

        {/* Bottom Total (Clean - NO resume button, NO delete button) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block leading-none mb-0.5">
              Total
            </span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              Rs. {order.subtotal.toLocaleString()}
            </span>
          </div>
          {isSelectMode && (
            <span className="text-[10px] font-semibold text-slate-400">
              {isSelected ? 'Selected' : 'Tap to select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const POSTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { userEmail, businessName, currentUser, logout, userName } = useAuth();
  const { isRTL } = useLanguage();
  const [colorMode, setColorMode] = useColorMode();
  const isDark = isDarkModeActive();

  // Dynamic Counter & Logged-In Cashier
  const { posSlug } = useParams<{ posSlug?: string }>();
  const currentTerminalSlug = (posSlug || 'pos1').toLowerCase();
  const currentCounterConfig = posService.getTerminalBySlug(currentTerminalSlug);
  const loggedInCashier = posService.getLoggedInCashier(currentTerminalSlug);

  // Cashier profile info
  const displayCashierName = loggedInCashier?.name || userName || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || (userEmail ? userEmail.split('@')[0] : 'Cashier');
  const displayCashierRole = loggedInCashier?.role ? (loggedInCashier.role.charAt(0).toUpperCase() + loggedInCashier.role.slice(1)) : 'Cashier';
  const displayCashierEmail = loggedInCashier ? `${loggedInCashier.name.toLowerCase().replace(/\s+/g, '.')}@pos.local` : (userEmail || currentUser?.email || 'cashier@uzairjibran.com');

  // Profile dropdown and In-POS settings modal
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [isPosSettingsModalOpen, setIsPosSettingsModalOpen] = useState<boolean>(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileDropdownOpen]);

  // Manager Override Modal State
  const [isManagerOverrideModalOpen, setIsManagerOverrideModalOpen] = useState(false);
  const [managerOverrideReason, setManagerOverrideReason] = useState<'discount' | 'refund'>('discount');
  const [pendingDiscountValue, setPendingDiscountValue] = useState<number>(0);
  const [managerOverridePasswordInput, setManagerOverridePasswordInput] = useState('');

  const handlePromptDiscount = () => {
    const input = prompt('Enter discount percentage (0 - 50%):', String(discountPercent));
    if (input === null) return;
    const val = Math.min(50, Math.max(0, Number(input) || 0));
    if (val === 0) {
      setDiscountPercent(0);
      return;
    }
    // Check if counter requires manager approval
    if (currentCounterConfig?.require_manager_for_discount !== false) {
      setPendingDiscountValue(val);
      setManagerOverrideReason('discount');
      setManagerOverridePasswordInput('');
      setIsManagerOverrideModalOpen(true);
    } else {
      setDiscountPercent(val);
      toast.success(`Discount of ${val}% applied`);
    }
  };

  const handleVerifyManagerOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (posService.verifyManagerOverride(currentTerminalSlug, managerOverridePasswordInput)) {
      if (managerOverrideReason === 'discount') {
        setDiscountPercent(pendingDiscountValue);
        toast.success(`Manager Override Approved: ${pendingDiscountValue}% discount applied`);
      }
      setIsManagerOverrideModalOpen(false);
      setManagerOverridePasswordInput('');
    } else {
      toast.error('Invalid Manager Password. Authorization denied.', { icon: '🔒' });
      setManagerOverridePasswordInput('');
    }
  };

  // Dynamic Theme Accent
  const [accentColor, setAccentColor] = useState<string>(getSavedAccentColor());
  useEffect(() => {
    const handleThemeChange = () => setAccentColor(getSavedAccentColor());
    window.addEventListener('uzair_jibran_theme_color_changed', handleThemeChange);
    return () => window.removeEventListener('uzair_jibran_theme_color_changed', handleThemeChange);
  }, []);

  const contrastText = getContrastTextColor(accentColor);
  const safeAccentText = getSafeAccentTextColor(accentColor, isDark);
  const isAccentWhite = accentColor.toLowerCase() === '#ffffff' || accentColor.toLowerCase() === '#fff';
  const activeSidebarBg = isAccentWhite
    ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)')
    : `${accentColor}18`;

  // POS Settings & Active Shift
  const [posConfig, setPosConfig] = useState<PosSettings>(() => posService.getSettings());
  const [activeShift, setActiveShift] = useState<PosShift | null>(() => posService.getActiveShift(currentCounterConfig?.name || posConfig.terminal_name));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(posConfig.sound_effects_enabled);

  const resolveInitialFulfillment = (config: PosSettings) => {
    const def = config?.default_fulfillment;
    if (!def || def === 'None' || def.toLowerCase() === 'unselected') return '';
    return def;
  };

  // Sync settings when changed in POS Settings Modal
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const updated = posService.getSettings();
      setPosConfig(updated);
      setSoundEnabled(updated.sound_effects_enabled);
      setCustomerName(updated.default_customer_name || 'Walk-in Customer');
      setTaxPercent(updated.default_tax_rate || 0);
      setFulfillmentType(resolveInitialFulfillment(updated));
    };
    window.addEventListener('pos_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('pos_settings_updated', handleSettingsUpdate);
  }, []);

  // Time & Session
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sub-view within POS Terminal (keeps user inside POS without redirecting back to ERP)
  type PosView = 'register' | 'transactions' | 'catalog' | 'returns' | 'summary';
  const [activeView, setActiveView] = useState<PosView>('register');

  // Products & Categories
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [categories, setCategories] = useState<PosCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortByDate, setSortByDate] = useState<'newest' | 'oldest'>('newest');
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);

  // Load Catalog Data
  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const [prods, cats] = await Promise.all([
        posService.getProducts(),
        posService.getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load POS catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Automatically refresh catalog when returning to register
  useEffect(() => {
    if (activeView === 'register') {
      loadCatalog();
    }
  }, [activeView]);

  // Listen for instant updates from catalog (images, visibility, additions)
  useEffect(() => {
    const handleCatalogUpdate = () => {
      loadCatalog();
    };
    window.addEventListener('pos_catalog_updated', handleCatalogUpdate);
    return () => window.removeEventListener('pos_catalog_updated', handleCatalogUpdate);
  }, []);

  // Helper to accurately match a product to a category hierarchy
  const isProductInCategory = (p: PosProductItem, cat: PosCategoryItem) => {
    const leafMatch = p.category.toLowerCase() === cat.name.toLowerCase();
    if (!leafMatch) return false;
    if (cat.parent_name && p.parent_category) {
      return p.parent_category.toLowerCase() === cat.parent_name.toLowerCase();
    }
    return true;
  };

  // Filtered Products (with Date-Wise Sorting)
  const filteredProducts = useMemo(() => {
    const activeCat = categories.find((c) => c.id === selectedCategory || c.name === selectedCategory);

    const filtered = products.filter((p) => {
      if (p.show_in_pos === false) return false;
      if (!posService.isProductVisibleOnCounter(p, currentTerminalSlug)) return false;
      const matchCat =
        selectedCategory === 'All' ||
        (activeCat ? isProductInCategory(p, activeCat) : p.category.toLowerCase() === selectedCategory.toLowerCase());
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        p.product_name.toLowerCase().includes(query) ||
        (p.item_sr_no && p.item_sr_no.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    return filtered.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : Number(a.id) || 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : Number(b.id) || 0;
      return sortByDate === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [products, categories, selectedCategory, searchQuery, sortByDate, currentTerminalSlug]);

  // Current Ticket / Cart State
  const [cartItems, setCartItems] = useState<PosOrderItem[]>([]);
  const [ticketNumber, setTicketNumber] = useState<string>(() => {
    const shift = posService.getActiveShift(currentCounterConfig?.name || posConfig.terminal_name);
    if (!shift) return '';
    return posService.getNextOrderNumber(shift.business_date);
  });
  const [customerName, setCustomerName] = useState<string>(posConfig.default_customer_name || 'Walk-in Customer');
  const [customerTier, setCustomerTier] = useState<'VIP' | 'Regular' | 'Retail'>('VIP');
  const [fulfillmentType, setFulfillmentType] = useState<string>(() => resolveInitialFulfillment(posConfig));
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState<boolean>(false);
  const [pendingOpenPaymentAfterFulfillment, setPendingOpenPaymentAfterFulfillment] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(posConfig.default_tax_rate || 0);

  // Held Orders State
  const [heldOrders, setHeldOrders] = useState<PosHeldOrder[]>(() => posService.getHeldOrders());
  const [isHeldModalOpen, setIsHeldModalOpen] = useState<boolean>(false);
  const [isHoldNoteModalOpen, setIsHoldNoteModalOpen] = useState<boolean>(false);
  const [holdNoteInput, setHoldNoteInput] = useState<string>('');
  const [selectedHeldIds, setSelectedHeldIds] = useState<string[]>([]);
  const [isHeldSelectMode, setIsHeldSelectMode] = useState<boolean>(false);
  const [swipedHeldId, setSwipedHeldId] = useState<string | null>(null);

  // Lock Terminal State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockPin, setLockPin] = useState<string>('');

  // Center Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = ({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = true,
    onConfirm
  }: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      isDestructive,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Digital' | 'Split'>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<POSPaymentAccount | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');

  const posPaymentAccounts = useMemo(() => {
    return posService.getPOSActiveAccounts();
  }, [isPayModalOpen]);

  useEffect(() => {
    if (posPaymentAccounts.length > 0 && !selectedPaymentAccount) {
      setSelectedPaymentAccount(posPaymentAccounts[0]);
    }
  }, [posPaymentAccounts]);

  const filteredPaymentAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) return posPaymentAccounts;
    const q = accountSearchQuery.toLowerCase();
    return posPaymentAccounts.filter(a => 
      a.bank_name.toLowerCase().includes(q) ||
      a.account_title.toLowerCase().includes(q) ||
      a.account_number.toLowerCase().includes(q) ||
      (a.branch_name && a.branch_name.toLowerCase().includes(q))
    );
  }, [posPaymentAccounts, accountSearchQuery]);

  // Receipt Modal State
  const [completedOrder, setCompletedOrder] = useState<PosOrder | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptSize, setReceiptSize] = useState<'80mm' | '58mm'>(posConfig.receipt_paper_size || '80mm');

  // Cash Drawer & Day Session Modal State
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'open_day' | 'close_day' | 'movement'>('open_day');

  // Day Open State
  const [dayOpenDate, setDayOpenDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const existingSessionForDate = useMemo(() => {
    return posService.getExistingClosedShiftForDate(dayOpenDate, currentCounterConfig?.name || posConfig.terminal_name);
  }, [dayOpenDate, currentCounterConfig, posConfig.terminal_name, isDrawerModalOpen, activeShift]);
  const [dayOpenPettyCash, setDayOpenPettyCash] = useState<number>(() => posService.getLastClosingPettyCash());
  const [dayOpenCashIn, setDayOpenCashIn] = useState<number>(0);
  const [dayOpenCashOut, setDayOpenCashOut] = useState<number>(0);
  const [pettyCashSource, setPettyCashSource] = useState<string>(() => {
    const lookup = posService.getPettyCashForDate(new Date().toISOString().split('T')[0]);
    return lookup.isFound ? `Auto-filled from ${lookup.foundDate} close` : 'Manual start / First day';
  });

  const handleDayOpenDateChange = (newDate: string) => {
    setDayOpenDate(newDate);
    const lookup = posService.getPettyCashForDate(newDate);
    setDayOpenPettyCash(lookup.amount);
    setPettyCashSource(lookup.isFound ? `Auto-filled from ${lookup.foundDate} close` : 'No prior shift before this date (enter manually)');
  };

  // Day Close State
  const [dayCloseDate, setDayCloseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dayCloseCashOut, setDayCloseCashOut] = useState<number>(0);
  const [dayCloseCashIn, setDayCloseCashIn] = useState<number>(0);
  const [dayCloseNotes, setDayCloseNotes] = useState<string>('');

  // Quick Movement State
  const [drawerMovementType, setDrawerMovementType] = useState<'in' | 'out'>('in');
  const [drawerAmount, setDrawerAmount] = useState<number>(0);
  const [drawerReason, setDrawerReason] = useState<string>('');

  // Stale (Unclosed Previous Day) Shift Detection
  const [staleShift, setStaleShift] = useState<PosShift | null>(() => posService.getStaleShift(currentCounterConfig?.name || posConfig.terminal_name));
  const [selectedZReport, setSelectedZReport] = useState<PosShift | null>(null);
  const [isStaleShiftModalOpen, setIsStaleShiftModalOpen] = useState<boolean>(() => Boolean(posService.getStaleShift()));

  useEffect(() => {
    const stale = posService.getStaleShift();
    setStaleShift(stale);
    if (stale) {
      setIsStaleShiftModalOpen(true);
    }
  }, [activeShift]);

  // Open Drawer Modal on Day Close tab for the stale shift
  const handleOpenCloseForStaleShift = () => {
    if (!staleShift) return;
    setIsStaleShiftModalOpen(false);
    setDrawerTab('close_day');
    const sDate = posService.getShiftBusinessDate(staleShift);
    setDayCloseDate(sDate || new Date().toISOString().split('T')[0]);
    setDayCloseCashOut(0);
    setDayCloseCashIn(0);
    setDayCloseNotes('Closed from overdue shift prompt');
    setIsDrawerModalOpen(true);
  };

  // Quick One-Click Auto-Close for Stale Shift
  const handleQuickAutoCloseStaleShift = async () => {
    if (!staleShift) return;
    try {
      const todayDateStr = posService.getTodayDateStr();
      const sDate = posService.getShiftBusinessDate(staleShift);
      const closed = await posService.closeDayShift({
        shiftId: staleShift.id,
        cashOut: 0,
        cashIn: 0,
        closingNotes: `Auto-closed on ${todayDateStr} when opening new day session.`,
        actualCountedCash: staleShift.expected_cash
      });
      setActiveShift(null);
      setStaleShift(null);
      setIsStaleShiftModalOpen(false);
      setTicketNumber('');
      setCartItems([]);
      playTone('success');
      toast.success(`Previous shift for ${sDate || 'old date'} successfully closed!`);

      setSelectedZReport(closed);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to auto-close previous shift');
    }
  };

  const handleOpenDrawerModal = () => {
    const shift = posService.getActiveShift();
    setActiveShift(shift);
    if (!shift) {
      setDrawerTab('open_day');
      const todayStr = new Date().toISOString().split('T')[0];
      setDayOpenDate(todayStr);
      const lookup = posService.getPettyCashForDate(todayStr);
      setDayOpenPettyCash(lookup.amount);
      setPettyCashSource(lookup.isFound ? `Auto-filled from ${lookup.foundDate} close` : 'No prior shift before this date (enter manually)');
      setDayOpenCashIn(0);
      setDayOpenCashOut(0);
    } else {
      setDrawerTab('movement');
      setDayCloseCashOut(0);
      setDayCloseCashIn(0);
    }
    setIsDrawerModalOpen(true);
  };

  // Barcode Scanner Ref
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Play Sound helper
  const playTone = (type: 'notification' | 'success' | 'scan' | 'warning' | 'delete') => {
    if (soundEnabled) {
      try {
        triggerFeedbackSound(type, userEmail);
      } catch (_) {}
    }
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.line_total, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * (discountPercent || 0)) / 100);
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return Math.round((taxableAmount * (taxPercent || 0)) / 100);
  }, [taxableAmount, taxPercent]);

  const grandTotal = Math.max(0, taxableAmount + taxAmount);
  const changeDue = Math.max(0, cashTendered - grandTotal);

  // Packaging & Handover selection handlers
  const handleSelectFulfillment = (type: string) => {
    setFulfillmentType(type);
    setIsFulfillmentModalOpen(false);
    playTone('success');
    if (type) {
      toast.success(`Packaging mode: ${type}`);
    } else {
      toast.success('Handover mode reset to Unselected');
    }
    if (pendingOpenPaymentAfterFulfillment) {
      setPendingOpenPaymentAfterFulfillment(false);
      setCashTendered(grandTotal);
      setIsPayModalOpen(true);
    }
  };

  const handleCloseFulfillmentModal = () => {
    setIsFulfillmentModalOpen(false);
    setPendingOpenPaymentAfterFulfillment(false);
    // Explicitly remains unselected if closed without choosing
  };

  // Keyboard Shortcuts (F2: Search/Scan, F4: Hold, F9: Pay, Esc: Clear/Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;

      // When fulfillment modal is open, quick-pick 1, 2, 3 (Keyboard friendly across top row & numpad)
      if (isFulfillmentModalOpen) {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectFulfillment('In-Store Bag');
          return;
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectFulfillment('Takeaway');
          return;
        } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          handleSelectFulfillment('Delivery');
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseFulfillmentModal();
          return;
        }
      }

      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) handleOpenHoldModal();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cartItems.length > 0 && !isPayModalOpen) handleOpenPayment();
      } else if (e.key === 'Escape') {
        if (isHoldNoteModalOpen) setIsHoldNoteModalOpen(false);
        else if (isFulfillmentModalOpen) handleCloseFulfillmentModal();
        else if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        else if (isPayModalOpen) setIsPayModalOpen(false);
        else if (isHeldModalOpen) setIsHeldModalOpen(false);
        else if (isDrawerModalOpen) setIsDrawerModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isLocked, isPayModalOpen, isReceiptModalOpen, isHeldModalOpen, isDrawerModalOpen, isFulfillmentModalOpen, isHoldNoteModalOpen, pendingOpenPaymentAfterFulfillment, grandTotal]);

  // Guard check: Cash Drawer & Day session must be open before any sale activity
  const requireOpenDrawer = (): boolean => {
    const stale = posService.getStaleShift();
    if (stale) {
      playTone('warning');
      const shiftDate = posService.getShiftBusinessDate(stale);
      toast.error(`Shift from ${shiftDate || 'previous day'} is still open. Please close old day shift first!`, {
        id: 'stale-shift-guard',
        duration: 4500,
        icon: '⚠️'
      });
      setIsStaleShiftModalOpen(true);
      return false;
    }
    if (!activeShift) {
      playTone('warning');
      toast.error('Please open the drawer first! Business day is closed.', {
        id: 'drawer-closed-guard',
        duration: 4000,
        icon: '🔒'
      });
      handleOpenDrawerModal();
      return false;
    }
    return true;
  };

  // Add Item to Cart
  const handleAddToCart = (product: PosProductItem) => {
    if (!requireOpenDrawer()) return;
    playTone('scan');
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.product_id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        const existing = next[idx];
        const newQty = existing.quantity + 1;
        next[idx] = {
          ...existing,
          quantity: newQty,
          line_total: newQty * existing.unit_price - existing.discount_amount
        };
        return next;
      }
      const newItem: PosOrderItem = {
        product_id: product.id,
        product_name: product.product_name,
        product_code: product.item_sr_no || 'ITM',
        barcode: product.barcode,
        image_url: product.image_url,
        category: product.category,
        uom: product.uom || 'PCS',
        quantity: 1,
        unit_price: product.retail_price,
        discount_amount: 0,
        line_total: product.retail_price
      };
      return [...prev, newItem];
    });
  };

  // Adjust Quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((it) => {
          if (it.product_id === productId) {
            const newQty = it.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...it,
              quantity: newQty,
              line_total: newQty * it.unit_price - it.discount_amount
            };
          }
          return it;
        })
        .filter(Boolean) as PosOrderItem[];
    });
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    playTone('delete');
    setCartItems((prev) => prev.filter((it) => it.product_id !== productId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    showConfirm({
      title: 'Clear Current Order',
      message: 'Are you sure you want to remove all items from the current cart?',
      confirmLabel: 'Clear Cart',
      isDestructive: true,
      onConfirm: () => {
        playTone('delete');
        setCartItems([]);
        setDiscountPercent(0);
        setFulfillmentType(resolveInitialFulfillment(posConfig));
        toast.success('Order cart cleared');
      }
    });
  };

  // Barcode / Fast Input Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireOpenDrawer()) return;
    const query = searchQuery.trim();
    if (!query) return;

    // Search by exact barcode or item_sr_no
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) ||
        (p.item_sr_no && p.item_sr_no.toLowerCase() === query.toLowerCase())
    );

    if (matched) {
      handleAddToCart(matched);
      setSearchQuery('');
      toast.success(`Scanned: ${matched.product_name}`);
    } else {
      playTone('warning');
      toast.error(`Barcode not found: ${query}`);
    }
  };

  // Open Hold Order Note Prompt (Option 2)
  const handleOpenHoldModal = () => {
    if (!requireOpenDrawer()) return;
    if (cartItems.length === 0) {
      toast.error('No items in current order to hold.');
      return;
    }
    setHoldNoteInput('');
    setIsHoldNoteModalOpen(true);
  };

  // Confirm Hold Order
  const handleConfirmHoldOrder = (customNote?: string) => {
    if (cartItems.length === 0) return;
    const finalNote = (typeof customNote === 'string' ? customNote : holdNoteInput).trim();
    const orderLabel = `${customerName} (${cartItems.length} items)`;

    posService.holdOrder({
      order_number: ticketNumber,
      order_label: orderLabel,
      note: finalNote,
      cashier_name: displayCashierName,
      items: cartItems,
      subtotal,
      discount_percent: discountPercent,
      fulfillment_type: fulfillmentType,
      customer_name: customerName,
      customer_tier: customerTier
    });

    setHeldOrders(posService.getHeldOrders());
    setCartItems([]);
    setDiscountPercent(0);
    setFulfillmentType(resolveInitialFulfillment(posConfig));
    setTicketNumber(activeShift ? posService.getNextOrderNumber(activeShift.business_date) : '');
    setIsHoldNoteModalOpen(false);
    playTone('notification');
    toast.success(`Order ${ticketNumber} parked in Held Orders`);
  };

  // Resume Held Order with SAFE AUTO-SWAP (Option 2)
  const handleResumeHeldOrder = (held: PosHeldOrder) => {
    const resumeOrderNumber = held.order_number || held.ticket_number || '';

    // SAFE AUTO-SWAP: If current cart has items, automatically park current cart so nothing is lost!
    if (cartItems.length > 0) {
      const activeLabel = `${customerName} (${cartItems.length} items)`;
      posService.holdOrder({
        order_number: ticketNumber,
        order_label: activeLabel,
        note: 'Auto-parked during order switch',
        cashier_name: displayCashierName,
        items: cartItems,
        subtotal,
        discount_percent: discountPercent,
        fulfillment_type: fulfillmentType,
        customer_name: customerName,
        customer_tier: customerTier
      });
      toast.success(`Active order ${ticketNumber} auto-parked safely`);
    }

    // Restore held order with full context
    setCartItems(held.items);
    setCustomerName(held.customer_name || 'Walk-in Customer');
    setCustomerTier((held.customer_tier as any) || 'VIP');
    setDiscountPercent(held.discount_percent || 0);
    setFulfillmentType(held.fulfillment_type || '');
    setTicketNumber(resumeOrderNumber);

    // Remove from held list
    posService.removeHeldOrder(held.id);
    setHeldOrders(posService.getHeldOrders());
    setIsHeldModalOpen(false);
    playTone('notification');
    toast.success(`Resumed order ${resumeOrderNumber}`);
  };

  // Open Payment Modal
  const handleOpenPayment = () => {
    if (!requireOpenDrawer()) return;
    if (cartItems.length === 0) {
      toast.error('Cart is empty. Add products to order first.');
      return;
    }
    if (!fulfillmentType) {
      playTone('warning');
      setPendingOpenPaymentAfterFulfillment(true);
      setIsFulfillmentModalOpen(true);
      return;
    }
    setCashTendered(grandTotal);
    setIsPayModalOpen(true);
  };

  // Complete Order
  const handleCompleteOrder = async () => {
    if (paymentMethod === 'Cash' && cashTendered < grandTotal) {
      playTone('warning');
      toast.error(`Insufficient cash tendered. Total is Rs. ${grandTotal.toLocaleString()}`);
      return;
    }

    try {
      setIsProcessingSale(true);
      const orderPayload: Omit<PosOrder, 'id' | 'order_number' | 'created_at'> = {
        shift_id: activeShift?.id,
        order_number: ticketNumber,
        cashier_name: displayCashierName,
        customer_name: customerName,
        customer_tier: customerTier,
        terminal_code: posConfig.terminal_name || 'Terminal 01',
        fulfillment_type: fulfillmentType || 'In-Store Bag',
        subtotal,
        tax_percentage: taxPercent,
        tax_amount: taxAmount,
        discount_percentage: discountPercent,
        discount_amount: discountAmount,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        cash_tendered: paymentMethod === 'Cash' ? cashTendered : grandTotal,
        change_due: paymentMethod === 'Cash' ? changeDue : 0,
        status: 'Completed',
        notes: (paymentMethod === 'Digital' || paymentMethod === 'Card') && selectedPaymentAccount
          ? `Paid via ${selectedPaymentAccount.bank_name} (${selectedPaymentAccount.account_number})${paymentRefNumber ? ` • Ref: ${paymentRefNumber}` : ''}`
          : undefined,
        items: cartItems
      };

      const saved = await posService.createOrder(orderPayload);
      playTone('success');
      toast.success(`Sale completed! Order: ${saved.order_number}`);

      setCompletedOrder(saved);
      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);

      // Refresh Shift & Cart
      const updatedShift = posService.getActiveShift(currentCounterConfig?.name || posConfig.terminal_name);
      setActiveShift(updatedShift);
      setCartItems([]);
      setTicketNumber(updatedShift ? posService.getNextOrderNumber(updatedShift.business_date) : '');
      setDiscountPercent(0);
      setPaymentRefNumber('');
      setAccountSearchQuery('');
      setFulfillmentType(resolveInitialFulfillment(posConfig));
    } catch (err) {
      console.error('Failed to complete sale:', err);
      toast.error('Failed to save POS order');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Open Day Submit
  const handleOpenDaySubmit = async () => {
    try {
      const isResuming = Boolean(existingSessionForDate);
      const shift = await posService.openDayShift({
        businessDate: dayOpenDate,
        cashierName: displayCashierName,
        openingPettyCash: dayOpenPettyCash,
        cashIn: dayOpenCashIn,
        cashOut: dayOpenCashOut,
        terminalCode: currentCounterConfig?.name || posConfig.terminal_name
      });
      setActiveShift(shift);
      setTicketNumber(posService.getNextOrderNumber(shift.business_date));
      setIsDrawerModalOpen(false);
      playTone('success');
      if (isResuming) {
        toast.success(`Session #${shift.session_number} reopened & resumed for ${dayOpenDate}!`);
      } else {
        toast.success(`Day opened for ${dayOpenDate}! Opening Balance: Rs. ${shift.opening_float.toLocaleString()}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open day');
    }
  };

  // Close Day Submit
  const handleCloseDaySubmit = async () => {
    if (!activeShift) {
      toast.error('No active shift open to close.');
      return;
    }
    try {
      const closed = await posService.closeDayShift({
        shiftId: activeShift.id,
        cashOut: dayCloseCashOut,
        cashIn: dayCloseCashIn,
        closingNotes: dayCloseNotes
      });
      setActiveShift(null);
      setStaleShift(null);
      setIsStaleShiftModalOpen(false);
      setTicketNumber('');
      setCartItems([]);
      setIsDrawerModalOpen(false);
      playTone('success');
      toast.success(`Day closed! Remaining Petty Cash: Rs. ${(closed.closing_petty_cash || 0).toLocaleString()} saved for next day.`);
      setSelectedZReport(closed);

    } catch (e: any) {
      toast.error(e?.message || 'Failed to close day');
    }
  };

  // Drawer Cash In / Out
  const handleDrawerMovement = () => {
    if (!drawerAmount || drawerAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!activeShift) {
      toast.error('No active shift open. Please start a shift first.');
      return;
    }
    posService.recordCashMovement(activeShift.id, drawerMovementType, drawerAmount);
    setActiveShift(posService.getActiveShift(currentCounterConfig?.name || posConfig.terminal_name));
    setIsDrawerModalOpen(false);
    setDrawerAmount(0);
    setDrawerReason('');
    playTone('notification');
    toast.success(`Drawer cash ${drawerMovementType.toUpperCase()} of Rs. ${drawerAmount.toLocaleString()} recorded`);
  };

  // Lock / Unlock Terminal
  const handleUnlock = () => {
    setIsLocked(false);
    setLockPin('');
    toast.success('Terminal unlocked');
  };

  const currentCashierName = userEmail?.split('@')[0] || 'Alex Rivera';
  const displayBrand = businessName || posConfig.store_title || 'Atelier Terminal';

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 font-sans select-none ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT POS SIDEBAR (Atelier Terminal Navigation)
         ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white dark:bg-[#111622] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shrink-0 z-20 shadow-sm">
        {/* Top Brand Logo */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md transition-all duration-300 ${isAccentWhite ? 'border border-slate-300 dark:border-slate-700' : ''}`}
                style={{ backgroundColor: accentColor, color: contrastText }}
              >
                <MdPointOfSale size={22} />
              </div>
              <div className="leading-tight">
                <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <span>{displayBrand}</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {posConfig.terminal_name} • POS
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Loads views in-place without redirecting to ERP) */}
          <nav className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveView('register');
                loadCatalog();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer ${
                activeView === 'register'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              style={
                activeView === 'register'
                  ? { backgroundColor: activeSidebarBg, color: safeAccentText }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <MdPointOfSale size={17} />
                <span>Register Terminal</span>
              </div>
              {activeView === 'register' && (
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: safeAccentText }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LuPauseCircle size={17} className="text-amber-500" />
                <span>Held Orders</span>
              </div>
              {heldOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {heldOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('transactions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer ${
                activeView === 'transactions'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              style={
                activeView === 'transactions'
                  ? { backgroundColor: activeSidebarBg, color: safeAccentText }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <LuReceipt size={17} className="text-sky-500" />
                <span>Transactions</span>
              </div>
              {activeView === 'transactions' && (
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: safeAccentText }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenDrawerModal}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LuBanknote size={17} className="text-emerald-500" />
                <span>Cash Drawer</span>
              </div>
              <span className={`text-[10px] font-mono font-bold ${activeShift ? 'text-slate-400' : 'text-amber-500'}`}>
                {activeShift ? `Rs. ${(activeShift.expected_cash || 0).toLocaleString()}` : 'Day Closed'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer ${
                activeView === 'catalog'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              style={
                activeView === 'catalog'
                  ? { backgroundColor: activeSidebarBg, color: safeAccentText }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <LuShoppingBag size={17} className="text-purple-500" />
                <span>POS Store Catalog</span>
              </div>
              {activeView === 'catalog' && (
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: safeAccentText }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('returns')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer ${
                activeView === 'returns'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              style={
                activeView === 'returns'
                  ? { backgroundColor: activeSidebarBg, color: safeAccentText }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <LuRotateCcw size={17} className="text-rose-500" />
                <span>Returns & Refunds</span>
              </div>
              {activeView === 'returns' && (
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: safeAccentText }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('summary')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer ${
                activeView === 'summary'
                  ? 'shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              style={
                activeView === 'summary'
                  ? { backgroundColor: activeSidebarBg, color: safeAccentText }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <LuBarChart3 size={17} className="text-indigo-500" />
                <span>Reports & Daily Summary</span>
              </div>
              {activeView === 'summary' && (
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: safeAccentText }}
                />
              )}
            </button>
          </nav>
        </div>

        {/* Bottom Lock & Exit Buttons */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          {/* Lock Terminal Button */}
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LuLock size={15} className="text-amber-500" />
              <span>Lock Terminal</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase">Screen Lock</span>
          </button>

          {/* Exit to ERP Dashboard Button */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <LuArrowLeft size={14} />
            <span>Exit to ERP System</span>
          </button>

          {/* System status pill */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>99.8% Online</span>
            </div>
            <span className="font-mono text-[10px]">v1.4 POS</span>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN WORKSPACE (Top Navbar + Catalog + Order Ticket Panel)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* ── TOP POS NAVBAR ── */}
        <header className="h-16 bg-white dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3 z-40 relative w-full max-w-full overflow-hidden">
          
          {/* Left: Terminal pill & Live clock */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px] sm:max-w-none">
                {posConfig.terminal_name}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden md:inline">•</span>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hidden md:flex items-center gap-1.5">
                <LuCalendar size={13} className="text-primary opacity-80" />
                {currentDate}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden xl:inline">•</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold hidden xl:inline">
                {currentTime}
              </span>
            </div>

            {/* Back to Register Terminal if in Sub-view */}
            {activeView !== 'register' && (
              <button
                type="button"
                onClick={() => {
                  setActiveView('register');
                  loadCatalog();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <LuArrowLeft size={14} />
                <span>Back to Register</span>
              </button>
            )}

            {/* Quick Action: + New Sale (Only on Register view to prevent overflow) */}
            {activeView === 'register' && (
              <button
                type="button"
                onClick={() => {
                  if (!requireOpenDrawer()) return;
                  const startFresh = () => {
                    setCartItems([]);
                    setTicketNumber(activeShift ? posService.getNextOrderNumber(activeShift.business_date) : '');
                    setFulfillmentType(resolveInitialFulfillment(posConfig));
                    toast.success('New sale order started');
                  };

                  if (cartItems.length > 0) {
                    showConfirm({
                      title: 'Start New Sale',
                      message: 'Starting a new sale will clear current items in cart. Do you want to continue?',
                      confirmLabel: 'Start New Sale',
                      isDestructive: false,
                      onConfirm: startFresh
                    });
                    return;
                  }
                  startFresh();
                }}
                className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <LuPlus size={14} className="text-primary" />
                <span>+ New Sale</span>
              </button>
            )}
          </div>

          {/* Center: Live Barcode & Item Search Input */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 max-w-md min-w-[110px] relative">
            <div className="relative">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or scan... [F2]"
                className="w-full pl-10 pr-20 sm:pr-24 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-2xs"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <IoBarcodeOutline size={13} />
                <span className="hidden sm:inline">Scan [F2]</span>
                <span className="sm:hidden">Scan</span>
              </button>
            </div>
          </form>

          {/* Right: Quick Action Buttons, Sound, Mode, Cashier info */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Held Tickets Count */}
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition cursor-pointer"
              title="Held orders"
            >
              <LuPauseCircle size={15} />
              <span className="hidden sm:inline">Held</span>
              <span>({heldOrders.length})</span>
            </button>

            {/* Quick Drawer */}
            <button
              type="button"
              onClick={handleOpenDrawerModal}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                activeShift
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
              title="Cash drawer & business day operations"
            >
              <LuBanknote size={15} />
              <span className="hidden lg:inline">Drawer</span>
              {!activeShift && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-mono font-bold">
                  Closed
                </span>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                toast.success(next ? 'Sound effects enabled' : 'Sound effects muted');
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
              title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            >
              {soundEnabled ? <LuVolume2 size={16} /> : <LuVolumeX size={16} />}
            </button>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = colorMode === 'dark' ? 'light' : 'dark';
                setColorMode(next);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
              title="Toggle theme mode"
            >
              {isDark ? <LuSun size={16} className="text-amber-400" /> : <LuMoon size={16} />}
            </button>

            {/* Active Cashier Avatar, Name & Profile Dropdown */}
            <div ref={profileDropdownRef} className="relative z-50 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen((prev) => !prev);
                }}
                className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-90 transition cursor-pointer select-none text-left"
                title="Cashier Profile & POS Settings"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    color: contrastText,
                    border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                  }}
                >
                  {displayCashierName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden 2xl:block leading-tight text-left">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white capitalize truncate max-w-[120px]">
                    {displayCashierName}
                  </span>
                  {activeShift ? (
                    <span className="block text-[10px] text-emerald-500 font-semibold">
                      Shift Active
                    </span>
                  ) : (
                    <span className="block text-[10px] text-amber-500 font-bold">
                      🔒 Day Closed
                    </span>
                  )}
                </div>
                <LuChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 hidden sm:block ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 animate-fadeIn space-y-1.5"
                  style={{ zIndex: 99999 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User Profile Info Card */}
                  <div className="px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <p className="text-xs font-black text-slate-900 dark:text-white capitalize truncate" title={displayCashierName}>
                      {displayCashierName}
                    </p>
                    <p className="text-[11px] text-primary font-bold capitalize mt-0.5">
                      {currentCounterConfig?.name || 'Counter'} • {displayCashierRole}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-medium">Drawer Status:</span>
                      {activeShift ? (
                        <span className="font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Shift Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleOpenDrawerModal();
                          }}
                          className="font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Open Drawer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settings Button (Opens In-POS Settings Modal) */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setIsPosSettingsModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <LuSettings size={16} className="text-primary" />
                    <span>POS Settings</span>
                  </button>

                  {/* Exit to ERP Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <LuArrowLeft size={16} className="text-slate-500" />
                    <span>Exit to ERP</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      posService.clearLoggedInCashier(currentTerminalSlug);
                      toast.success(`Logged out ${displayCashierName}`);
                      navigate(`/${currentTerminalSlug}`);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <LuLogOut size={16} />
                    <span>Log Out Cashier</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── STALE SHIFT WARNING BANNER ── */}
        {staleShift && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2.5 flex items-center justify-between gap-4 text-xs shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <LuAlertTriangle className="text-amber-500 shrink-0 text-base" />
              <div className="truncate">
                <span className="font-extrabold text-amber-900 dark:text-amber-200">
                  Unclosed Previous Shift:
                </span>{' '}
                <span className="text-amber-800 dark:text-amber-300">
                  Shift #{staleShift.session_number} for {posService.getShiftBusinessDate(staleShift) || 'previous day'} is still open. Please close it before ringing up today's sales.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenCloseForStaleShift}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Close Old Shift
              </button>
              <button
                type="button"
                onClick={handleQuickAutoCloseStaleShift}
                className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Auto-Close
              </button>
            </div>
          </div>
        )}

        {/* ── WORKSPACE BODY: (Center Catalog + Right Cart OR Embedded POS Sub-Pages) ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {activeView === 'register' && (
            <>
          {/* ─────────────────────────────────────────────────────────────
              CENTER: PRODUCT CATALOG & CATEGORY SELECTOR
             ───────────────────────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0B0F17] min-w-0">
            
            {/* Warning Banner when Cash Drawer / Day is closed */}
            {!activeShift && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-700 dark:text-amber-300 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <LuLock size={15} className="text-amber-500 shrink-0" />
                  <span>Cash Drawer & Day Session are closed. Please open the drawer first to create sales.</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDrawerModal}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <LuUnlock size={13} />
                  <span>Open Drawer First</span>
                </button>
              </div>
            )}

            {/* Category Filter Pills (with Dynamic Display Style: pill | card | text) */}
            <div className="p-3 bg-white dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
              {/* All Items Button */}
              {(() => {
                const catStyle = posConfig.category_display_style || 'pill';
                const isAllSelected = selectedCategory === 'All';
                const totalItemCount = products.filter((p) => p.show_in_pos !== false && posService.isProductVisibleOnCounter(p, currentTerminalSlug)).length;

                if (catStyle === 'card') {
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`rounded-2xl text-center transition shrink-0 cursor-pointer flex flex-col items-center justify-between w-[115px] sm:w-[125px] h-[105px] border overflow-hidden ${
                        isAllSelected
                          ? 'shadow-sm scale-[1.02]'
                          : 'bg-white dark:bg-[#151c2e] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      style={
                        isAllSelected
                          ? {
                              backgroundColor: accentColor,
                              color: contrastText,
                              borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                            }
                          : undefined
                      }
                    >
                      <div
                        className={`w-full h-14 flex items-center justify-center shrink-0 ${
                          isAllSelected
                            ? 'bg-black/10 dark:bg-white/15 text-current'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <LuLayers size={22} />
                      </div>
                      <div className="w-full px-2 py-1.5 text-center leading-tight">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-black tracking-tight truncate">All Items</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              isAllSelected
                                ? 'bg-black/15 dark:bg-white/20 text-current'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {totalItemCount}
                          </span>
                        </div>
                        <span className="text-[9px] opacity-75 font-medium block truncate leading-none mt-1">
                          All Categories
                        </span>
                      </div>
                    </button>
                  );
                }

                if (catStyle === 'text') {
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`px-3.5 py-2 rounded-xl text-left transition shrink-0 cursor-pointer flex items-center gap-2 border ${
                        isAllSelected
                          ? 'shadow-xs scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                      }`}
                      style={
                        isAllSelected
                          ? {
                              backgroundColor: accentColor,
                              color: contrastText,
                              borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                            }
                          : undefined
                      }
                    >
                      <span className="text-xs font-black tracking-tight">All Items</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                          isAllSelected
                            ? 'bg-black/10 dark:bg-white/15 text-current'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {totalItemCount}
                      </span>
                    </button>
                  );
                }

                // Default: 'pill' (side thumbnail)
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-xl text-left transition shrink-0 cursor-pointer flex items-center gap-2.5 min-w-[120px] border ${
                      isAllSelected
                        ? 'shadow-xs scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                    style={
                      isAllSelected
                        ? {
                            backgroundColor: accentColor,
                            color: contrastText,
                            borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isAllSelected
                          ? 'bg-black/10 dark:bg-white/15 text-current'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <LuLayers size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-black tracking-tight">All Items</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                            isAllSelected
                              ? 'bg-black/10 dark:bg-white/15 text-current'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {totalItemCount}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-75 font-medium mt-0.5 block leading-tight">
                        All Categories
                      </span>
                    </div>
                  </button>
                );
              })()}

              {/* Filtered Categories */}
              {categories
                .filter((c) => c.show_in_pos !== false && posService.isCategoryVisibleOnCounter(c, currentTerminalSlug))
                .map((cat) => {
                  const count = products.filter(
                    (p) => p.show_in_pos !== false && posService.isProductVisibleOnCounter(p, currentTerminalSlug) && isProductInCategory(p, cat)
                  ).length;
                  const isSelected = selectedCategory === cat.id || selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return { cat, count, isSelected };
                })
                .filter(({ count, isSelected }) => count > 0 || isSelected)
                .map(({ cat, count, isSelected }) => {
                  const catStyle = posConfig.category_display_style || 'pill';
                  const hierarchyParts = [cat.parent_name, cat.sub_name]
                    .filter(Boolean)
                    .map((s) => String(s).trim())
                    .filter((v, i, a) => a.indexOf(v) === i && v.toLowerCase() !== cat.name.toLowerCase());
                  const subtitleText = hierarchyParts.length > 0 ? hierarchyParts.join(' • ') : 'Cloth Category';

                  if (catStyle === 'card') {
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`rounded-2xl text-center transition shrink-0 cursor-pointer flex flex-col items-center justify-between w-[115px] sm:w-[125px] h-[105px] border overflow-hidden ${
                          isSelected
                            ? 'shadow-sm scale-[1.02]'
                            : 'bg-white dark:bg-[#151c2e] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: accentColor,
                                color: contrastText,
                                borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                              }
                            : undefined
                        }
                        title={cat.full_path || cat.name}
                      >
                        {cat.image_url ? (
                          <div className="w-full h-14 bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative">
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-full h-14 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-black/10 dark:bg-white/15 text-current'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <LuTag size={20} />
                          </div>
                        )}
                        <div className="w-full px-2 py-1.5 text-center leading-tight">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-black tracking-tight truncate max-w-[85px]">{cat.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-black/15 dark:bg-white/20 text-current'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {count}
                            </span>
                          </div>
                          <span className="text-[9px] opacity-75 font-medium block truncate max-w-full leading-none mt-1">
                            {subtitleText}
                          </span>
                        </div>
                      </button>
                    );
                  }

                  if (catStyle === 'text') {
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-left transition shrink-0 cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? 'shadow-xs scale-[1.02]'
                            : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: accentColor,
                                color: contrastText,
                                borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                              }
                            : undefined
                        }
                        title={cat.full_path || cat.name}
                      >
                        <span className="text-xs font-black tracking-tight">{cat.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                            isSelected
                              ? 'bg-black/10 dark:bg-white/15 text-current'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  }

                  // Default: 'pill' (side thumbnail)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-left transition shrink-0 cursor-pointer flex items-center gap-2.5 min-w-[130px] max-w-[250px] border ${
                        isSelected
                          ? 'shadow-xs scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: accentColor,
                              color: contrastText,
                              borderColor: isAccentWhite ? '#cbd5e1' : 'transparent'
                            }
                          : undefined
                      }
                      title={cat.full_path || cat.name}
                    >
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/10 dark:border-white/10 shadow-2xs"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-black/10 dark:bg-white/15 text-current'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <LuTag size={15} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-black tracking-tight truncate">
                            {cat.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              isSelected
                                ? 'bg-black/10 dark:bg-white/15 text-current'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                        <span className="text-[10px] opacity-75 font-medium mt-0.5 block leading-tight truncate">
                          {subtitleText}
                        </span>
                      </div>
                    </button>
                  );
                })}

              {/* Date-Wise Sort Toggle Pill */}
              <button
                type="button"
                onClick={() => setSortByDate((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                className="ml-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                title="Toggle ordering: Newest Added First vs Oldest First"
              >
                <LuClock size={13} className="text-primary" />
                <span>{sortByDate === 'newest' ? '📅 Newest First' : '📅 Oldest First'}</span>
              </button>
            </div>

            {/* Product Card Grid (4 Columns) */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCatalog ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Loading catalog items...</p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <LuStore size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No matching products found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                    Try searching with another keyword, clearing the category filter, or scanning a barcode.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: accentColor,
                      color: contrastText,
                      border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                (() => {
                    const isCompactProduct = (posConfig.product_card_size || 'tall') === 'compact';
                    return (
                      <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${isCompactProduct ? 'gap-2.5' : 'gap-3.5'}`}>
                        {filteredProducts.map((prod) => {
                          const cartItem = cartItems.find((it) => it.product_id === prod.id);

                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleAddToCart(prod)}
                              className={`group relative rounded-2xl bg-white dark:bg-[#111622] border transition-all duration-200 ${
                                isCompactProduct ? 'p-2 sm:p-2.5' : 'p-3'
                              } flex flex-col justify-between cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                                cartItem
                                  ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30'
                                  : 'border-slate-200 dark:border-slate-800/80 hover:border-primary/50'
                              }`}
                            >
                              {/* Selected quantity badge */}
                              {cartItem && (
                                <div
                                  className={`absolute ${isCompactProduct ? 'top-1.5 right-1.5 w-5 h-5 text-[10px]' : 'top-2.5 right-2.5 w-6 h-6 text-xs'} z-10 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce`}
                                  style={{
                                    backgroundColor: accentColor,
                                    color: contrastText,
                                    border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                                  }}
                                >
                                  {cartItem.quantity}
                                </div>
                              )}

                              {/* Product Image / Full Placeholder */}
                              <div className={`relative w-full ${
                                isCompactProduct ? 'h-24 sm:h-28 mb-1.5' : 'h-48 sm:h-52 mb-2.5'
                              } rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 shrink-0`}>
                                {prod.image_url ? (
                                  <img
                                    src={prod.image_url}
                                    alt={prod.product_name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/60 dark:from-slate-800/50 dark:to-slate-800/90 text-slate-300 dark:text-slate-600 group-hover:text-primary/70 transition-colors">
                                    <LuShoppingBag size={isCompactProduct ? 30 : 48} className="opacity-70 group-hover:scale-110 transition-transform duration-200" />
                                  </div>
                                )}

                                {/* Category Badge */}
                                <span className={`absolute ${isCompactProduct ? 'bottom-1 left-1 px-1.5 py-0.2 text-[9px]' : 'bottom-2 left-2 px-2 py-0.5 text-[10px]'} rounded-md font-bold bg-black/60 backdrop-blur-xs text-white`}>
                                  {prod.category}
                                </span>
                              </div>

                              {/* Product Title & Code */}
                              <div className={isCompactProduct ? 'space-y-0.5 mb-1.5' : 'space-y-1 mb-2'}>
                                <h4
                                  className={`font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors ${
                                    isCompactProduct ? 'text-[11px] sm:text-xs' : 'text-xs'
                                  }`}
                                  title={prod.product_name}
                                >
                                  {prod.product_name}
                                </h4>
                                {(() => {
                                  const hierarchyParts = [prod.parent_category, prod.sub_category]
                                    .filter(Boolean)
                                    .map((s: any) => String(s).trim())
                                    .filter((v, i, a) => a.indexOf(v) === i);
                                  if (hierarchyParts.length === 0) return null;
                                  const catLine = hierarchyParts.join(' • ');
                                  return (
                                    <p className={`${isCompactProduct ? 'text-[9px]' : 'text-[10px]'} text-slate-400 font-medium truncate`} title={catLine}>
                                      {catLine}
                                    </p>
                                  );
                                })()}
                                <div className={`flex items-center justify-between text-slate-400 ${isCompactProduct ? 'text-[9px]' : 'text-[10px]'}`}>
                                  <span className="font-mono">{prod.item_sr_no || 'SKU'}</span>
                                  <span className="text-emerald-500 font-semibold">In Stock</span>
                                </div>
                              </div>

                              {/* Price & Add Indicator */}
                              <div className={`flex items-center justify-between ${isCompactProduct ? 'pt-1.5' : 'pt-2'} border-t border-slate-100 dark:border-slate-800/60`}>
                                <span className={`${isCompactProduct ? 'text-xs' : 'text-xs sm:text-sm'} font-extrabold text-slate-900 dark:text-white`}>
                                  Rs. {prod.retail_price.toLocaleString()}
                                </span>
                                <div className={`${isCompactProduct ? 'w-5 h-5 rounded-md text-[11px]' : 'w-6 h-6 rounded-lg text-xs'} bg-slate-100 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold transition`}>
                                  <LuPlus size={isCompactProduct ? 11 : 13} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
              )}
            </div>

            {/* ── BOTTOM STATUS BAR ── */}
            <footer className="h-10 bg-white dark:bg-[#111622] border-t border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <LuCoins className="text-amber-500 text-sm" />
                  <span>Drawer Balance:</span>
                  <strong className="text-slate-800 dark:text-white font-mono">
                    {activeShift ? `Rs. ${(activeShift.expected_cash || 0).toLocaleString()}` : 'Closed (Day Not Open)'}
                  </strong>
                </span>

                <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>

                <span className="hidden sm:flex items-center gap-1.5">
                  <LuReceipt className="text-sky-500 text-sm" />
                  <span>Sales Today:</span>
                  <strong className="text-slate-800 dark:text-white font-mono">
                    {posService.getAllOrders().length} Orders
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <LuPrinter className="text-emerald-500 text-sm" />
                  <span>Thermal Printer:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {posConfig.receipt_paper_size} Online
                  </strong>
                </span>

                <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">•</span>

                <span className="hidden md:flex items-center gap-1 text-[11px]">
                  <LuShieldCheck className="text-primary" />
                  <span>Secure Cloud Sync</span>
                </span>
              </div>
            </footer>
          </main>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT: ORDER TICKET / CART PANEL
             ───────────────────────────────────────────────────────────── */}
          <aside className="w-80 lg:w-96 bg-white dark:bg-[#111622] border-l border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shrink-0 shadow-sm z-10">
            
            {/* 1. Ticket Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 space-y-2.5">
              {/* Customer Selector */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <LuUser size={15} />
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none truncate flex-1"
                  />
                </div>
              </div>

              {/* Order Meta: Order Number & Fulfillment Handover Pill */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Order:</span>
                  {activeShift && ticketNumber ? (
                    <span
                      className="font-mono font-black text-[11px] text-slate-800 dark:text-slate-100 truncate max-w-[140px] sm:max-w-[190px]"
                      title={ticketNumber}
                    >
                      {ticketNumber}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                      Day Closed
                    </span>
                  )}
                </div>

                <div className="shrink-0 ml-auto">
                  {activeShift ? (
                    fulfillmentType ? (
                      <button
                        type="button"
                        onClick={() => setIsFulfillmentModalOpen(true)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs hover:border-primary/60 bg-white dark:bg-[#161D2B] border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 group active:scale-95"
                        title="Click to change order handover mode"
                      >
                        {fulfillmentType === 'Delivery' ? (
                          <span className="w-4 h-4 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <LuTruck size={11} />
                          </span>
                        ) : fulfillmentType === 'Takeaway' ? (
                          <span className="w-4 h-4 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <LuPackage size={11} />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <LuShoppingBag size={11} />
                          </span>
                        )}
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100 truncate max-w-[80px]">
                          {fulfillmentType}
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-primary dark:text-primary-light bg-primary/10 px-1 py-0.5 rounded-md group-hover:bg-primary group-hover:text-white transition-colors">
                          <LuArrowRightLeft size={8} />
                          <span>Change</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsFulfillmentModalOpen(true)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold border border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-150 cursor-pointer shadow-2xs group"
                        title="Packaging not selected. Click to choose handover mode."
                      >
                        <LuShoppingBag size={12} className="text-amber-500 animate-bounce shrink-0" />
                        <span className="text-[11px]">Handover</span>
                        <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded-md group-hover:scale-105 transition-transform shrink-0">
                          Unselected
                        </span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenDrawerModal}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer"
                    >
                      <LuUnlock size={11} />
                      <span>Open Day</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Scrollable Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {!activeShift ? (
                <div
                  onClick={handleOpenDrawerModal}
                  className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl transition"
                  title="Click to open the cash drawer and business day session"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <LuLock size={26} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Day Session is Closed
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    No business date active. Please open the cash drawer to generate an Order ID and start taking sales.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenDrawerModal}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <LuUnlock size={13} />
                    <span>Open Day Session</span>
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <LuReceipt size={26} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No items in order
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Tap products from the catalog or scan barcodes to begin sale.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="rounded-xl p-2.5 bg-slate-50 dark:bg-[#161D2B] border border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between gap-2.5"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                          {item.product_name.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Title & Unit Price */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={item.product_name}>
                        {item.product_name}
                      </h5>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Rs. {item.unit_price.toLocaleString()}
                      </span>
                    </div>

                    {/* Stepper Buttons [- 1 +] */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#111622] rounded-lg border border-slate-200 dark:border-slate-700 px-1 py-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product_id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-rose-500 transition cursor-pointer"
                      >
                        <LuMinus size={11} />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-slate-800 dark:text-white font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product_id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-emerald-500 transition cursor-pointer"
                      >
                        <LuPlus size={11} />
                      </button>
                    </div>

                    {/* Line Total & Delete */}
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-xs text-slate-900 dark:text-white font-mono">
                        Rs. {item.line_total.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 transition cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <LuTrash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 3. Ticket Calculations & Checkout Footer */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0E131E] space-y-3">
              
              {/* Subtotal, Discount & Tax */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>

                {/* Discount Row */}
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <span>Discount</span>
                    <button
                      type="button"
                      onClick={() => {
                        const input = prompt('Enter discount percentage (0 - 50):', String(discountPercent));
                        if (input !== null) {
                          const val = Math.min(50, Math.max(0, Number(input) || 0));
                          setDiscountPercent(val);
                        }
                      }}
                      className="text-[10px] font-bold text-primary underline cursor-pointer"
                    >
                      ({discountPercent}% edit)
                    </button>
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    - Rs. {discountAmount.toLocaleString()}
                  </span>
                </div>

                {/* Tax Row */}
                {taxPercent > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({taxPercent}%)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      + Rs. {taxAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                    Total
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Hold, Clear & Place Order */}
              <div className="space-y-2">
                {!activeShift ? (
                  <button
                    type="button"
                    onClick={handleOpenDrawerModal}
                    className="w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  >
                    <LuLock size={16} />
                    <span>Please Open Drawer First</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={cartItems.length === 0}
                    onClick={handleOpenPayment}
                    className="w-full py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 active:scale-98"
                    style={{
                      backgroundColor: accentColor,
                      color: contrastText,
                      border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                    }}
                  >
                    <MdPointOfSale size={18} />
                    <span>Place Order [F9] • Rs. {grandTotal.toLocaleString()}</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={cartItems.length === 0}
                    onClick={handleOpenHoldModal}
                    className="py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <LuPauseCircle size={14} />
                    <span>Hold Order [F4]</span>
                  </button>

                  <button
                    type="button"
                    disabled={cartItems.length === 0}
                    onClick={handleClearCart}
                    className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <LuTrash2 size={14} />
                    <span>Clear Order</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
            </>
          )}

          {activeView === 'transactions' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] min-w-0 p-3 sm:p-5">
              <POSOrders embedded onBack={() => setActiveView('register')} />
            </div>
          )}

          {activeView === 'catalog' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] min-w-0 p-3 sm:p-5">
              <POSCatalog embedded onBack={() => { setActiveView('register'); loadCatalog(); }} />
            </div>
          )}

          {activeView === 'returns' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] min-w-0 p-3 sm:p-5">
              <POSOrders embedded isReturnsOnly onBack={() => setActiveView('register')} />
            </div>
          )}

          {activeView === 'summary' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B0F17] min-w-0 p-3 sm:p-5">
              <POSRegister embedded onBack={() => { setActiveView('register'); setActiveShift(posService.getActiveShift(currentCounterConfig?.name || posConfig.terminal_name)); }} />
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: PAYMENT TENDER & CHECKOUT
         ───────────────────────────────────────────────────────────── */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <MdPointOfSale className="text-primary text-xl" />
                  <span>Payment Tender</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order {ticketNumber} • {customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Payment Method Selector */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'Cash', label: 'Cash', icon: LuBanknote },
                  { id: 'Card', label: 'Card (POS)', icon: LuCreditCard },
                  { id: 'Digital', label: 'Digital / QR', icon: LuQrCode },
                  { id: 'Split', label: 'Split', icon: LuCoins }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: isAccentWhite
                                ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.08)')
                                : `${accentColor}18`,
                              color: safeAccentText
                            }
                          : undefined
                      }
                    >
                      <Icon size={20} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Total Due Display */}
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Net Amount Due
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    Rs. {grandTotal.toLocaleString()}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary">
                  {cartItems.length} items
                </span>
              </div>

              {/* Cash Tendered & Quick Buttons */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cash Tendered from Customer:
                  </label>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                    placeholder="Enter cash given"
                    className="w-full px-4 py-2.5 text-base font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  />

                  {/* Quick Denominations */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      { label: 'Exact', val: grandTotal },
                      { label: '+500', val: Math.ceil(grandTotal / 500) * 500 },
                      { label: '+1,000', val: Math.ceil(grandTotal / 1000) * 1000 },
                      { label: '+5,000', val: Math.ceil(grandTotal / 5000) * 5000 }
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashTendered(btn.val)}
                        className="py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Pill */}
                  <div className="rounded-xl p-3.5 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Change Due to Customer:
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-300 font-mono">
                      Rs. {changeDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Digital & Card Payment Destination Account Selector */}
              {(paymentMethod === 'Digital' || paymentMethod === 'Card') && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MdPointOfSale size={14} className="text-primary" />
                      <span>Destination Account ({paymentMethod === 'Card' ? 'Card POS Terminal' : 'Digital / QR'}):</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {posPaymentAccounts.length} Active in POS
                    </span>
                  </div>

                  {/* Search box if multiple accounts */}
                  {posPaymentAccounts.length > 2 && (
                    <div className="relative">
                      <LuSearch size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        placeholder="Search bank name or account #..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {posPaymentAccounts.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                        <LuAlertTriangle size={15} />
                        <span>No Bank / Digital Accounts Configured</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        No accounts are enabled for POS yet. Go to <b>Accounts &gt; Bank Account</b> and click <b>+ Add Bank Account</b> to register your accounts and enable <b>Show in POS</b>.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-0.5">
                      {filteredPaymentAccounts.map((acc) => {
                        const isSelected = selectedPaymentAccount?.id === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedPaymentAccount(acc)}
                            className={`p-2.5 rounded-xl text-left border transition flex items-start justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-xs'
                                : 'bg-white dark:bg-[#111622] border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0 pr-1 space-y-0.5">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {acc.bank_name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold truncate">
                                {acc.account_number}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {acc.account_title}
                              </div>
                            </div>
                            {isSelected && <LuCheck size={14} className="text-primary shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Transaction Reference / Approval Code */}
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Transaction / Approval Ref # (Optional):
                    </label>
                    <input
                      type="text"
                      value={paymentRefNumber}
                      onChange={(e) => setPaymentRefNumber(e.target.value)}
                      placeholder="e.g. TRX-99201, Raast Ref, or Slip #"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessingSale}
                onClick={handleCompleteOrder}
                className="flex-1 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wide transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <LuCheck size={16} />
                <span>
                  {isProcessingSale ? 'Finalizing...' : 'Complete Sale & Print Receipt'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: THERMAL RECEIPT PREVIEW (80mm & 58mm)
         ───────────────────────────────────────────────────────────── */}
      {isReceiptModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Actions */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptSize('80mm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    receiptSize === '80mm'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptSize('58mm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    receiptSize === '58mm'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  58mm Compact
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <LuPrinter size={13} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>

            {/* Thermal Slip Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-900 flex justify-center">
              <div
                className={`bg-white text-black p-5 shadow-lg font-mono text-xs rounded-sm transition-all duration-200 ${
                  receiptSize === '80mm' ? 'w-[320px]' : 'w-[240px]'
                }`}
              >
                {/* Store Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    {posConfig.store_title}
                  </h3>
                  <p className="text-[10px] leading-tight text-slate-700">{posConfig.store_address}</p>
                  <p className="text-[10px] text-slate-700">Phone: {posConfig.store_phone}</p>
                  <p className="text-[10px] font-bold text-slate-800">TAX / NTN: {posConfig.tax_id}</p>
                </div>

                {/* Ticket Meta */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Order #:</span>
                    <span className="font-bold">{completedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(completedOrder.created_at).toLocaleDateString()} {new Date(completedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{completedOrder.cashier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">{completedOrder.customer_name}</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1.5 text-[11px]">
                  <div className="flex justify-between font-bold pb-1 border-b border-dotted border-black/40">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/4 text-center">Rate</span>
                    <span className="w-1/4 text-right">Total</span>
                  </div>

                  {completedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="w-1/2 truncate font-semibold" title={it.product_name}><span className="font-bold">{it.quantity} × </span>{it.product_name}</span>
                      <span className="w-1/4 text-center font-mono">{it.unit_price.toLocaleString()}</span>
                      <span className="w-1/4 text-right font-bold font-mono">
                        {it.line_total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {completedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  {completedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({completedOrder.discount_percentage}%):</span>
                      <span className="font-mono">- Rs. {completedOrder.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {completedOrder.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({completedOrder.tax_percentage}%):</span>
                      <span className="font-mono">+ Rs. {completedOrder.tax_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dotted border-black">
                    <span>TOTAL:</span>
                    <span className="font-mono">Rs. {completedOrder.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Tender & Change */}
                <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Tendered ({completedOrder.payment_method}):</span>
                    <span className="font-mono">Rs. {completedOrder.cash_tendered.toLocaleString()}</span>
                  </div>
                  {completedOrder.notes && (
                    <div className="text-[9.5px] text-slate-700 font-mono py-0.5">
                      {completedOrder.notes}
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Change Due:</span>
                    <span className="font-mono">Rs. {completedOrder.change_due.toLocaleString()}</span>
                  </div>
                </div>

                {/* Barcode & Footer Disclaimer */}
                <div className="pt-3 text-center space-y-2">
                  <div className="flex justify-center">
                    <Barcode
                      value={completedOrder.order_number}
                      width={1.2}
                      height={35}
                      fontSize={10}
                      margin={0}
                    />
                  </div>
                  <p className="text-[9px] leading-tight text-slate-600">
                    {posConfig.footer_message}
                  </p>
                  <p className="text-[8px] text-slate-400 font-medium">{posConfig.software_credit || "Software Developed by: NHT ENTERPRISES - +92 312 8039911"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ORDER PACKAGING & HANDOVER MODE (HORIZONTAL & KEYBOARD FRIENDLY)
         ───────────────────────────────────────────────────────────── */}
      {isFulfillmentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={handleCloseFulfillmentModal}
        >
          <div
            className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <LuShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Select Packaging & Handover Mode
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose how this order will be handed over to the customer. Press <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">1</kbd>, <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">2</kbd>, or <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">3</kbd> to quick-select.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseFulfillmentModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Close (Esc) - Remains unselected"
              >
                <LuX size={20} />
              </button>
            </div>

            {/* Modal Body: 3 Interactive Option Cards HORIZONTALLY */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: In-Store Bag */}
              <button
                type="button"
                onClick={() => handleSelectFulfillment('In-Store Bag')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                  fulfillmentType === 'In-Store Bag'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-emerald-500/60 hover:bg-emerald-500/5'
                }`}
              >
                {/* Top Row: Hotkey Tag & Active Indicator */}
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">Key</span> [ 1 ]
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      fulfillmentType === 'In-Store Bag'
                        ? 'border-emerald-500 bg-emerald-500 text-white scale-110 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 group-hover:border-emerald-400'
                    }`}
                  >
                    {fulfillmentType === 'In-Store Bag' && <LuCheck size={14} className="stroke-[3]" />}
                  </div>
                </div>

                {/* Center Icon */}
                <div className="my-2">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 group-hover:scale-105 ${
                      fulfillmentType === 'In-Store Bag'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                    }`}
                  >
                    <LuShoppingBag size={28} />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      In-Store Bag
                    </h4>
                    {fulfillmentType === 'In-Store Bag' && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Boutique shopping bag handed over immediately to walk-in customer.
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className={fulfillmentType === 'In-Store Bag' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500 transition-colors'}>
                    {fulfillmentType === 'In-Store Bag' ? '✓ Currently Selected' : 'Press 1 or Click'}
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>

              {/* Option 2: Takeaway / Shop Pickup */}
              <button
                type="button"
                onClick={() => handleSelectFulfillment('Takeaway')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                  fulfillmentType === 'Takeaway'
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-amber-500/60 hover:bg-amber-500/5'
                }`}
              >
                {/* Top Row: Hotkey Tag & Active Indicator */}
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">Key</span> [ 2 ]
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      fulfillmentType === 'Takeaway'
                        ? 'border-amber-500 bg-amber-500 text-white scale-110 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 group-hover:border-amber-400'
                    }`}
                  >
                    {fulfillmentType === 'Takeaway' && <LuCheck size={14} className="stroke-[3]" />}
                  </div>
                </div>

                {/* Center Icon */}
                <div className="my-2">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 group-hover:scale-105 ${
                      fulfillmentType === 'Takeaway'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white'
                    }`}
                  >
                    <LuPackage size={28} />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Takeaway / Pickup
                    </h4>
                    {fulfillmentType === 'Takeaway' && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Packed parcel or boxed suit reserved for customer pickup or takeaway.
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className={fulfillmentType === 'Takeaway' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 group-hover:text-amber-500 transition-colors'}>
                    {fulfillmentType === 'Takeaway' ? '✓ Currently Selected' : 'Press 2 or Click'}
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>

              {/* Option 3: Delivery / Courier */}
              <button
                type="button"
                onClick={() => handleSelectFulfillment('Delivery')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                  fulfillmentType === 'Delivery'
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-primary/60 hover:bg-primary/5'
                }`}
              >
                {/* Top Row: Hotkey Tag & Active Indicator */}
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-primary/15 text-primary dark:text-primary-light border border-primary/30 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">Key</span> [ 3 ]
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      fulfillmentType === 'Delivery'
                        ? 'border-primary bg-primary text-white scale-110 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 group-hover:border-primary/60'
                    }`}
                  >
                    {fulfillmentType === 'Delivery' && <LuCheck size={14} className="stroke-[3]" />}
                  </div>
                </div>

                {/* Center Icon */}
                <div className="my-2">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 group-hover:scale-105 ${
                      fulfillmentType === 'Delivery'
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                    }`}
                  >
                    <LuTruck size={28} />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Delivery / Courier
                    </h4>
                    {fulfillmentType === 'Delivery' && (
                      <span className="text-[10px] font-bold text-primary dark:text-primary-light bg-primary/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Dispatched by rider, bike delivery, or courier service with tracking details.
                  </p>
                </div>

                {/* Bottom Action Hint */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className={fulfillmentType === 'Delivery' ? 'text-primary dark:text-primary-light' : 'text-slate-400 group-hover:text-primary transition-colors'}>
                    {fulfillmentType === 'Delivery' ? '✓ Currently Selected' : 'Press 3 or Click'}
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#0c1017] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Keyboard Hotkeys:</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400">[1] Bag</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-amber-600 dark:text-amber-400">[2] Takeaway</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-primary">[3] Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                {fulfillmentType && (
                  <button
                    type="button"
                    onClick={() => handleSelectFulfillment('')}
                    className="px-3 py-1.5 rounded-xl font-bold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                    title="Clear current packaging mode back to Unselected"
                  >
                    Clear (Unselected)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseFulfillmentModal}
                  className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  Close (Esc)
                </button>
              </div>
              </div>
            </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: HOLD ORDER QUICK-NOTE (OPTION 2)
         ───────────────────────────────────────────────────────────── */}
      {isHoldNoteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsHoldNoteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <LuPauseCircle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Hold Order: {ticketNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add an optional reference note or press Enter to park immediately
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHoldNoteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmHoldOrder(holdNoteInput);
              }}
              className="p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Order Reference / Note (Optional):
                </label>
                <input
                  type="text"
                  autoFocus
                  value={holdNoteInput}
                  onChange={(e) => setHoldNoteInput(e.target.value)}
                  placeholder="e.g. Trying another suit / At ATM / Reserved"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Trying another suit', 'Customer at ATM', 'Waiting for fabric', 'Phone Inquiry'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setHoldNoteInput(tag);
                      handleConfirmHoldOrder(tag);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-500/15 hover:text-amber-600 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsHoldNoteModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer"
                >
                  Park Order [Enter]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: HELD ORDERS SLIDE-OVER DRAWER (OPTION 2)
         ───────────────────────────────────────────────────────────── */}
      {isHeldModalOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsHeldModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#111622] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col animate-slideLeft"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Top Multi-Delete & Select Controls */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <LuPauseCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      Held Orders
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                        {heldOrders.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Safe Auto-Swap enabled • Switch without losing active items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Top Clear / Multi-Select Button */}
                  {isHeldSelectMode ? (
                    <div className="flex items-center gap-1.5">
                      {selectedHeldIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const count = selectedHeldIds.length;
                            showConfirm({
                              title: `Delete ${count} Held Order${count > 1 ? 's' : ''}`,
                              message: `Are you sure you want to permanently delete the ${count} selected held order${count > 1 ? 's' : ''}?`,
                              confirmLabel: `Delete ${count} Order${count > 1 ? 's' : ''}`,
                              isDestructive: true,
                              onConfirm: () => {
                                selectedHeldIds.forEach(id => posService.removeHeldOrder(id));
                                setHeldOrders(posService.getHeldOrders());
                                setSelectedHeldIds([]);
                                setIsHeldSelectMode(false);
                                setSwipedHeldId(null);
                                playTone('delete');
                                toast.success(`${count} held order${count > 1 ? 's' : ''} deleted`);
                              }
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer animate-fadeIn"
                        >
                          <LuTrash2 size={14} />
                          <span>Delete ({selectedHeldIds.length})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeldSelectMode(false);
                          setSelectedHeldIds([]);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : heldOrders.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsHeldSelectMode(true)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Select multiple orders to delete"
                    >
                      <LuTrash2 size={18} />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setIsHeldModalOpen(false);
                      setIsHeldSelectMode(false);
                      setSelectedHeldIds([]);
                      setSwipedHeldId(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Close (Esc)"
                  >
                    <LuX size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-bar for Select All ONLY when isHeldSelectMode is true */}
              {isHeldSelectMode && heldOrders.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedHeldIds.length === heldOrders.length) {
                        setSelectedHeldIds([]);
                      } else {
                        setSelectedHeldIds(heldOrders.map(h => h.id));
                      }
                    }}
                    className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                      selectedHeldIds.length === heldOrders.length && heldOrders.length > 0
                        ? 'bg-primary border-primary text-white'
                        : selectedHeldIds.length > 0
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedHeldIds.length === heldOrders.length && heldOrders.length > 0 ? (
                        <LuCheck size={11} className="stroke-[3]" />
                      ) : selectedHeldIds.length > 0 ? (
                        <div className="w-1.5 h-1.5 bg-primary rounded-xs" />
                      ) : null}
                    </div>
                    <span>
                      {selectedHeldIds.length === heldOrders.length && heldOrders.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </span>
                  </button>

                  <span className="text-[11px] text-primary font-bold">
                    {selectedHeldIds.length > 0
                      ? `${selectedHeldIds.length} of ${heldOrders.length} selected`
                      : 'Tap any order container to select'}
                  </span>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldOrders.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <LuPauseCircle size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-semibold">No orders currently on hold.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Press [F4] while ringing an order to park it.</p>
                </div>
              ) : (
                heldOrders.map((h) => {
                  const displayOrderNumber = h.order_number || h.ticket_number || 'Order';
                  const orderId = h.id || displayOrderNumber;
                  const isSelected = selectedHeldIds.includes(orderId);
                  return (
                    <SwipeableHeldOrderCard
                      key={orderId}
                      order={{ ...h, id: orderId }}
                      isSelected={isSelected}
                      isSelectMode={isHeldSelectMode}
                      onToggleSelect={(id) => {
                        setSelectedHeldIds(prev =>
                          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                        );
                      }}
                      onResume={(order) => handleResumeHeldOrder(order)}
                      onDelete={(order) => {
                        showConfirm({
                          title: 'Delete Held Order',
                          message: `Are you sure you want to permanently delete held order ${displayOrderNumber}?`,
                          confirmLabel: 'Delete Order',
                          isDestructive: true,
                          onConfirm: () => {
                            posService.removeHeldOrder(order.id);
                            setHeldOrders(posService.getHeldOrders());
                            setSelectedHeldIds(prev => prev.filter(x => x !== orderId));
                            if (swipedHeldId === orderId) setSwipedHeldId(null);
                            playTone('delete');
                            toast.success(`Order ${displayOrderNumber} deleted`);
                          }
                        });
                      }}
                      isSwiped={swipedHeldId === orderId}
                      onSwipeChange={(id, swiped) => {
                        setSwipedHeldId(swiped ? id : null);
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: UNCLOSED PREVIOUS DAY SHIFT DETECTED
         ───────────────────────────────────────────────────────────── */}
      {isStaleShiftModalOpen && staleShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3.5 bg-amber-500/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <LuAlertTriangle size={22} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    Previous Day Shift Not Closed
                  </h3>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium leading-relaxed">
                  The register was not closed for <strong className="font-bold">{posService.getShiftBusinessDate(staleShift)}</strong>. Retail accounting requires closing the previous day's shift before ringing up new sales today.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStaleShiftModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                title="Dismiss (Sales will remain blocked until closed)"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Shift Details Summary */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Unclosed Date
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block font-mono">
                    {posService.getShiftBusinessDate(staleShift)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Shift Session
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                    Shift #{staleShift.session_number}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Drawer Expected
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                    Rs. {(staleShift.expected_cash || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cash Sales
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block font-mono">
                    Rs. {(staleShift.cash_sales || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> Choose <em>Close Shift with Cash Counts</em> to count drawer cash & enter notes, or <em>Quick Auto-Close</em> to balance with zero discrepancy and start today immediately.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenCloseForStaleShift}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <LuBanknote size={15} />
                <span>Close Shift with Cash Counts & Z-Report</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAutoCloseStaleShift}
                className="w-full py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Quick Auto-Close & Open Today (Rs. {(staleShift.expected_cash || 0).toLocaleString()} Forward)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ─────────────────────────────────────────────────────────────
          MODAL: DAILY Z-REPORT SLIP (AFTER DAY CLOSE)
         ───────────────────────────────────────────────────────────── */}
      {selectedZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <LuFileText className="text-primary" />
                <span>Daily Z-Report Slip #{selectedZReport.session_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedZReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Thermal Print Receipt */}
            <div className="bg-white text-black p-4 rounded-sm font-mono text-xs space-y-2 border border-slate-300 shadow-sm">
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
                <h4 className="font-extrabold text-sm uppercase">{posConfig.store_title || 'Uzair Jibran Cloth'}</h4>
                <p className="text-[10px]">DAILY Z-REPORT • CASHIER CLOSE</p>
                <p className="text-[10px]">Terminal: {selectedZReport.terminal_code}</p>
                <p className="text-[10px]">Cashier: {selectedZReport.cashier_name}</p>
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Session:</span>
                  <span className="font-bold">#{selectedZReport.session_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Business Date:</span>
                  <span className="font-bold">{selectedZReport.business_date || new Date(selectedZReport.opened_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opened:</span>
                  <span>{new Date(selectedZReport.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Closed:</span>
                  <span>{selectedZReport.closed_at ? new Date(selectedZReport.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}</span>
                </div>
              </div>

              {/* Financial Tenders with Card Sales highlighted */}
              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>Rs. {(selectedZReport.opening_float || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>Rs. {(selectedZReport.cash_sales || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold bg-slate-100 px-1 py-0.5 rounded">
                  <span>Card (POS) Sales:</span>
                  <span>Rs. {(selectedZReport.card_sales || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Digital / QR Sales:</span>
                  <span>Rs. {(selectedZReport.digital_sales || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash In / Out:</span>
                  <span>+{(selectedZReport.cash_in || 0).toLocaleString()} / -{(selectedZReport.cash_out || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
                  <span>TOTAL SALES VOLUME:</span>
                  <span>Rs. {((selectedZReport.cash_sales || 0) + (selectedZReport.card_sales || 0) + (selectedZReport.digital_sales || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Reconciliation Balance */}
              <div className="py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Expected Drawer Cash:</span>
                  <span>Rs. {(selectedZReport.expected_cash || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Closing Petty Cash (Rolled):</span>
                  <span className="font-bold">Rs. {(selectedZReport.closing_petty_cash || 0).toLocaleString()}</span>
                </div>
                {selectedZReport.closing_notes && (
                  <div className="text-[10px] text-slate-600 pt-1 border-t border-dotted border-black">
                    Notes: {selectedZReport.closing_notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedZReport(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LuPrinter size={14} />
                  <span>Print Z-Report</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedZReport(null);
                  handleOpenDrawerModal();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Today's Day Session ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ─────────────────────────────────────────────────────────────
          MODAL: MANAGER OVERRIDE APPROVAL (FOR DISCOUNTS & REFUNDS)
         ───────────────────────────────────────────────────────────── */}
      {isManagerOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111622] border border-amber-500/40 p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                <LuShieldCheck />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Manager Approval Required
                </h3>
                <p className="text-[11px] text-slate-400">
                  {managerOverrideReason === 'discount'
                    ? `Authorize ${pendingDiscountValue}% discount on this order`
                    : 'Authorize customer refund from cash drawer'}
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyManagerOverride} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter POS Admin / Manager Password:
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={managerOverridePasswordInput}
                  onChange={(e) => setManagerOverridePasswordInput(e.target.value)}
                  placeholder="Manager password / PIN..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-amber-500/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManagerOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: CASH DRAWER FLOAT & CASH IN / OUT
         ───────────────────────────────────────────────────────────── */}
      {isDrawerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <LuBanknote size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    Cash Drawer & Day Session
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Day Open, Day Close petty cash reconciliation & cash in/out
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab('open_day')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  drawerTab === 'open_day'
                    ? 'bg-white dark:bg-[#111622] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                style={drawerTab === 'open_day' ? { borderBottom: `2px solid ${safeAccentText}` } : undefined}
              >
                <span>Day Open</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('close_day')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  drawerTab === 'close_day'
                    ? 'bg-white dark:bg-[#111622] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                style={drawerTab === 'close_day' ? { borderBottom: `2px solid ${safeAccentText}` } : undefined}
              >
                <span>Day Close</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('movement')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  drawerTab === 'movement'
                    ? 'bg-white dark:bg-[#111622] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                style={drawerTab === 'movement' ? { borderBottom: `2px solid ${safeAccentText}` } : undefined}
              >
                <span>Cash In / Out</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* TAB 1: DAY OPEN */}
              {drawerTab === 'open_day' && (
                <div className="space-y-4">
                  {activeShift ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <LuCheckCircle2 size={16} />
                          <span>Shift #{activeShift.session_number} is Currently Open</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          {activeShift.business_date || new Date(activeShift.opened_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Opening Float: <strong>Rs. {activeShift.opening_float.toLocaleString()}</strong> (Petty Cash: Rs. {(activeShift.opening_petty_cash || 0).toLocaleString()}, Cash In: Rs. {(activeShift.opening_cash_in || 0).toLocaleString()}).
                      </p>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('close_day')}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        style={{
                          backgroundColor: accentColor,
                          color: contrastText,
                          border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                        }}
                      >
                        Proceed to Day Close ➔
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Date Select */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <LuCalendar size={13} className="text-primary" />
                          <span>Business Date:</span>
                        </label>
                        <input
                          type="date"
                          value={dayOpenDate}
                          onChange={(e) => handleDayOpenDateChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                      </div>

                      {/* Opening Petty Cash (Brought Forward from Last Working Day) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Petty Cash (Remaining from Last Close):
                          </label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {pettyCashSource}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={dayOpenPettyCash || ''}
                          onChange={(e) => setDayOpenPettyCash(Number(e.target.value) || 0)}
                          placeholder="e.g. 20000"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Cash In */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Cash In / Float Added (Rs.):
                        </label>
                        <input
                          type="number"
                          value={dayOpenCashIn || ''}
                          onChange={(e) => setDayOpenCashIn(Number(e.target.value) || 0)}
                          placeholder="e.g. 5000"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Optional Cash Out */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Cash Out (Optional Morning Drop / Expense) (Rs.):</span>
                          <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <input
                          type="number"
                          value={dayOpenCashOut || ''}
                          onChange={(e) => setDayOpenCashOut(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Live Calculation Preview */}
                      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
                          <span>Petty Cash: Rs. {dayOpenPettyCash.toLocaleString()}</span>
                          <span>+ Cash In: Rs. {dayOpenCashIn.toLocaleString()}</span>
                          <span>- Cash Out: Rs. {dayOpenCashOut.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            Total Opening Balance:
                          </span>
                          <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                            Rs. {(dayOpenPettyCash + dayOpenCashIn - dayOpenCashOut).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {existingSessionForDate && (
                        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <LuHistory size={15} />
                              <span>Session #{existingSessionForDate.session_number} Exists for {dayOpenDate}</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-200">
                              Closed Session
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            This counter already has <strong>Session #{existingSessionForDate.session_number}</strong> on this date with <strong>Rs. {((existingSessionForDate.cash_sales || 0) + (existingSessionForDate.card_sales || 0) + (existingSessionForDate.digital_sales || 0)).toLocaleString()}</strong> total sales. Reopening will resume Session #{existingSessionForDate.session_number} so all transactions stay consolidated.
                          </p>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        type="button"
                        onClick={handleOpenDaySubmit}
                        className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer hover:opacity-90"
                        style={{
                          backgroundColor: accentColor,
                          color: contrastText,
                          border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                        }}
                      >
                        {existingSessionForDate
                          ? `Resume Session #${existingSessionForDate.session_number} (${dayOpenDate})`
                          : `Confirm & Open Day (Rs. ${(dayOpenPettyCash + dayOpenCashIn - dayOpenCashOut).toLocaleString()})`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: DAY CLOSE */}
              {drawerTab === 'close_day' && (
                <div className="space-y-4">
                  {!activeShift ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        No active shift is currently open.
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Please open the day first to record sales and reconcile closing cash.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDrawerTab('open_day')}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        style={{
                          backgroundColor: accentColor,
                          color: contrastText,
                          border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                        }}
                      >
                        Go to Day Open ➔
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Date Select */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <LuCalendar size={13} className="text-primary" />
                          <span>Closing Date:</span>
                        </label>
                        <input
                          type="date"
                          value={dayCloseDate}
                          onChange={(e) => setDayCloseDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                      </div>

                      {/* Day Sales & Opening Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Opening Petty Cash
                          </span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
                            Rs. {(activeShift.opening_petty_cash ?? activeShift.opening_float).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Today's Cash Sales
                          </span>
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                            Rs. {(activeShift.cash_sales || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Card (POS) Sales
                          </span>
                          <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
                            Rs. {(activeShift.card_sales || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Cash Out (Main - Bank Deposit / Owner Payout) */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Cash Out (Take Home / Deposit to Owner / Bank) (Rs.):
                        </label>
                        <input
                          type="number"
                          value={dayCloseCashOut || ''}
                          onChange={(e) => setDayCloseCashOut(Number(e.target.value) || 0)}
                          placeholder="e.g. 50000"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Optional Cash In */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Cash In (Optional late return / recovery) (Rs.):</span>
                          <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <input
                          type="number"
                          value={dayCloseCashIn || ''}
                          onChange={(e) => setDayCloseCashIn(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Formula Box: (The Sale - Cash Out + (if Cash In)) + Opening Petty Cash = Remaining Petty Cash */}
                      {(() => {
                        const sales = Number(activeShift.cash_sales) || 0;
                        const openPetty = Number(activeShift.opening_petty_cash ?? activeShift.opening_float) || 0;
                        const closingPetty = Math.max(0, sales - dayCloseCashOut + dayCloseCashIn + openPetty);

                        return (
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                            <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                              Closing Formula Calculation
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              Sales (Rs. {sales.toLocaleString()}) - Cash Out (Rs. {dayCloseCashOut.toLocaleString()}) + Cash In (Rs. {dayCloseCashIn.toLocaleString()}) + Opening Petty (Rs. {openPetty.toLocaleString()})
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                Remaining Petty Cash (for Tomorrow):
                              </span>
                              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                Rs. {closingPetty.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ This remaining amount will automatically fill tomorrow's Day Open.
                            </p>
                          </div>
                        );
                      })()}

                      {/* Closing Notes */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Closing Notes / Handover:
                        </label>
                        <input
                          type="text"
                          value={dayCloseNotes}
                          onChange={(e) => setDayCloseNotes(e.target.value)}
                          placeholder="e.g. Handed Rs. 40,000 to owner, Rs. 15,000 kept in drawer"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="button"
                        onClick={handleCloseDaySubmit}
                        className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition shadow-sm cursor-pointer hover:opacity-90 bg-rose-600 hover:bg-rose-700"
                      >
                        Close Day & Finalize Petty Cash
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: QUICK CASH IN / OUT (DURING DAY) */}
              {drawerTab === 'movement' && (
                <div className="space-y-4">
                  {/* Drawer Live Balance Card */}
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Calculated Drawer Float & Cash
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      Rs. {(activeShift?.expected_cash || 24500).toLocaleString()}
                    </div>
                  </div>

                  {/* Movement Type Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDrawerMovementType('in')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        drawerMovementType === 'in'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <LuArrowDownLeft size={14} />
                      <span>Cash In (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerMovementType('out')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        drawerMovementType === 'out'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <LuArrowUpRight size={14} />
                      <span>Cash Out (-)</span>
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Amount (Rs.):
                    </label>
                    <input
                      type="number"
                      value={drawerAmount || ''}
                      onChange={(e) => setDrawerAmount(Number(e.target.value) || 0)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Reason / Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Reason / Description:
                    </label>
                    <input
                      type="text"
                      value={drawerReason}
                      onChange={(e) => setDrawerReason(e.target.value)}
                      placeholder="e.g. Petty cash refill, vendor cash drop, tea/refreshment"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={handleDrawerMovement}
                    className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: accentColor,
                      color: contrastText,
                      border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                    }}
                  >
                    Record Cash {drawerMovementType.toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          OVERLAY: SCREEN LOCK TERMINAL
         ───────────────────────────────────────────────────────────── */}
      {isLocked && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white p-6 animate-fadeIn">
          <div className="text-center space-y-4 max-w-sm w-full">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center font-bold shadow-2xl animate-pulse ${isAccentWhite ? 'border border-slate-300' : ''}`}
              style={{
                backgroundColor: accentColor,
                color: contrastText
              }}
            >
              <LuLock size={38} />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">{displayBrand}</h2>
              <p className="text-xs text-slate-400">
                Terminal #{posConfig.terminal_name} • Session Locked
              </p>
              <p className="text-[11px] text-emerald-400 font-mono">
                Cashier: {currentCashierName}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleUnlock}
                className="w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <LuUnlock size={16} />
                <span>Unlock Terminal Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: IN-POS SETTINGS & TERMINAL CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      {isPosSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7">
            <POSSettingsTab isModal onClose={() => setIsPosSettingsModalOpen(false)} />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CENTERED CONFIRMATION POPUP (REPLACES NATIVE BROWSER CONFIRM)
         ───────────────────────────────────────────────────────────── */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center animate-scaleIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                confirmDialog.isDestructive
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {confirmDialog.isDestructive ? <LuTrash2 size={26} /> : <LuAlertTriangle size={26} />}
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {confirmDialog.cancelLabel || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide text-white transition shadow-md cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-primary hover:opacity-90'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSTerminal;
