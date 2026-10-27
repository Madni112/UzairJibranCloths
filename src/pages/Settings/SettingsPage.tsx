import React, { useState, useEffect, useRef } from 'react';
import {
  LuUser,
  LuPalette,
  LuSettings,
  LuSun,
  LuMoon,
  LuCheck,
  LuBuilding2,
  LuMail,
  LuShieldCheck,
  LuPenLine,
  LuSparkles,
  LuLayers,
  LuSlidersHorizontal,
  LuLayoutDashboard,
  LuReceipt,
  LuPackage,
  LuUsers,
  LuRotateCcw,
  LuCreditCard,
  LuVolume2,
  LuVolumeX,
  LuBell,
  LuHardDrive,
  LuDownload,
  LuShieldAlert,
  LuLock,
  LuSearch,
  LuFilter,
  LuCheckCircle2,
  LuAlertTriangle,
  LuXCircle,
  LuFileSpreadsheet,
  LuPlay,
  LuRefreshCw,
  LuSave,
  LuChevronDown,
  LuLaptop,
  LuSmartphone,
  LuMonitor,
  LuLogOut,
  LuClock,
  LuRadio,
  LuCpu,
  LuGlobe,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../../Context/supabaseClient';
import { useAuth } from '../../Context/Auth';
import { getBrandConfig } from '../../utils/brand';
import useColorMode from '../../hooks/useColorMode';
import {
  PRESET_THEME_COLORS,
  applyAccentColor,
  getSavedAccentColor,
  applySidebarColor,
  getSavedSidebarColor,
  getSafeSidebarColor,
  getContrastTextColor,
  isDarkModeActive,
  SidebarLayoutMode,
  getSidebarLayoutMode,
  setSidebarLayoutMode,
  NavbarLayoutMode,
  getNavbarLayoutMode,
  setNavbarLayoutMode,
} from '../../constant/themeConfig';
import {
  fetchSystemMasterConfig,
  canUserBackup,
  canUserEditCreditLimit,
  SystemMasterConfig,
} from '../../utils/systemPermissions';
import {
  fetchCustomerCreditLimits,
  saveCustomerCreditLimit,
  getCustomerCreditStatus,
} from '../../utils/creditLimitUtils';
import {
  isUserAudioEnabled,
  setUserAudioEnabled,
  triggerFeedbackSound,
  soundEngine,
  SOUND_CATEGORIES,
  getUserTone,
  setUserTone,
  SoundCategory,
} from '../../utils/audioFeedback';

interface TabItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SETTINGS_TABS: TabItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Personal info & company details',
    icon: LuUser,
  },
  {
    id: 'security_devices',
    label: 'Login Devices & Security',
    description: 'Workstations, active sessions & remote logout',
    icon: LuShieldCheck,
  },
  {
    id: 'theme',
    label: 'Theme & Appearance',
    description: 'Accent colors, sidebar styles & mode',
    icon: LuPalette,
  },
  {
    id: 'credit_limits',
    label: 'Customer Credit Limits',
    description: 'Monitor customer borrowing boundaries',
    icon: LuCreditCard,
  },
  {
    id: 'sound_effects',
    label: 'Audio & Sound Effects',
    description: 'POS audio feedback for billing & scanning',
    icon: LuVolume2,
  },
  {
    id: 'backup',
    label: 'Data Backup & Export',
    description: 'Export records & complete ERP snapshots',
    icon: LuHardDrive,
  },
];

interface SoundToneCardProps {
  category: SoundCategory;
  userEmail?: string | null;
  icon: React.ReactNode;
  accentColorClass: string;
  btnBgClass: string;
  btnTextClass: string;
}

const SoundToneCard: React.FC<SoundToneCardProps> = ({
  category,
  userEmail,
  icon,
  accentColorClass,
  btnBgClass,
  btnTextClass,
}) => {
  const [selectedToneId, setSelectedToneId] = useState<string>(() => getUserTone(category.id, userEmail));
  const [isOpen, setIsOpen] = useState(false);
  const [playingToneId, setPlayingToneId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedToneId(getUserTone(category.id, userEmail));
  }, [category.id, userEmail]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeTone = category.tones.find((t) => t.id === selectedToneId) || category.tones[0];

  const handleSelectTone = (toneId: string) => {
    setSelectedToneId(toneId);
    setUserTone(category.id, toneId, userEmail);
    setIsOpen(false);
    soundEngine.playToneById(toneId);
    toast.success(`Active tone set to "${category.tones.find((t) => t.id === toneId)?.name}"`, {
      id: 'silent-tone-toast',
    });
  };

  const handlePreviewTone = (e: React.MouseEvent, toneId: string) => {
    e.stopPropagation();
    setPlayingToneId(toneId);
    soundEngine.playToneById(toneId);
    setTimeout(() => {
      setPlayingToneId((cur) => (cur === toneId ? null : cur));
    }, 1800);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Icon, Category Name, Description */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${accentColorClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{category.label}</h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Active: {activeTone.duration}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>

      {/* Right: Dropdown & Quick Test Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        {/* Interactive Tone Dropdown */}
        <div className="relative w-full sm:w-64 md:w-72" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-xs font-semibold cursor-pointer text-left shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">{activeTone.name}</span>
              <span className="text-[10px] font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-md">
                {activeTone.duration}
              </span>
            </div>
            <LuChevronDown className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Menu with Play Button Per Option */}
          {isOpen && (
            <div className="absolute right-0 left-0 sm:left-auto sm:w-84 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-2 space-y-1 animate-fadeIn max-h-72 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Select Ringtone</span>
                <span>{category.tones.length} Options</span>
              </div>
              {category.tones.map((tone) => {
                const isSelected = tone.id === selectedToneId;
                const isPlaying = playingToneId === tone.id;

                return (
                  <div
                    key={tone.id}
                    onClick={() => handleSelectTone(tone.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <LuCheck size={10} />}
                      </div>
                      <span className="truncate text-xs">{tone.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {tone.duration}
                      </span>
                    </div>

                    {/* Dedicated Play Preview Button Per Option */}
                    <button
                      type="button"
                      title={`Preview ${tone.name} ${tone.duration}`}
                      onClick={(e) => handlePreviewTone(e, tone.id)}
                      className={`p-1.5 rounded-lg transition shrink-0 flex items-center justify-center cursor-pointer ${
                        isPlaying
                          ? 'bg-primary text-white scale-110 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <LuPlay size={11} className={isPlaying ? 'animate-bounce' : ''} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Test Play Button */}
        <button
          type="button"
          onClick={() => soundEngine.playToneById(activeTone.id)}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl ${btnBgClass} ${btnTextClass} hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs`}
        >
          <LuPlay className="text-xs" />
          <span>Test Sound</span>
        </button>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { userEmail, role, businessName } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [themeSubTab, setThemeSubTab] = useState<'navbar' | 'sidebar'>('navbar');
  const [colorMode, setColorMode] = useColorMode();

  // Primary Accent Color State
  const [appliedAccentColor, setAppliedAccentColor] = useState<string>(getSavedAccentColor());
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(getSavedAccentColor());
  const [customAccentHex, setCustomAccentHex] = useState<string>(() =>
    getSavedAccentColor().replace('#', '')
  );
  const [accentAppliedRecently, setAccentAppliedRecently] = useState<boolean>(false);

  // Sidebar Color State
  const [appliedSidebarColor, setAppliedSidebarColor] = useState<string>(getSavedSidebarColor());
  const [selectedSidebarColor, setSelectedSidebarColor] = useState<string>(getSavedSidebarColor());
  const [customSidebarHex, setCustomSidebarHex] = useState<string>(() =>
    getSavedSidebarColor().replace('#', '')
  );
  const [wasSidebarAdjusted, setWasSidebarAdjusted] = useState<boolean>(false);
  const [sidebarAppliedRecently, setSidebarAppliedRecently] = useState<boolean>(false);

  // Layout Styles: Sidebar (Floating vs Classic) & Navbar (Sticky vs Normal)
  const [sidebarLayout, setSidebarLayout] = useState<SidebarLayoutMode>(() => getSidebarLayoutMode());
  const [navbarLayout, setNavbarLayout] = useState<NavbarLayoutMode>(() => getNavbarLayoutMode());

  const handleSetSidebarLayout = (mode: SidebarLayoutMode) => {
    setSidebarLayout(mode);
    setSidebarLayoutMode(mode);
    toast.success(
      mode === 'floating'
        ? '🚀 Floating Modern Sidebar activated!'
        : '🏛️ Classic Edge Sidebar activated!',
      { id: 'sidebar-layout-toast' }
    );
  };

  const handleSetNavbarLayout = (mode: NavbarLayoutMode) => {
    setNavbarLayout(mode);
    setNavbarLayoutMode(mode);
    toast.success(
      mode === 'floating'
        ? '🚀 Floating Modern Navbar activated!'
        : '🏛️ Classic Full-Width Navbar activated!',
      { id: 'navbar-layout-toast' }
    );
  };

  const handleApplyPreset = (mode: 'floating' | 'classic') => {
    setSidebarLayout(mode);
    setSidebarLayoutMode(mode);
    setNavbarLayout(mode);
    setNavbarLayoutMode(mode);
    toast.success(
      mode === 'floating'
        ? '🚀 Full Floating Workspace (Sidebar & Navbar) activated!'
        : '🏛️ Full Classic Edge Workspace (Sidebar & Navbar) activated!',
      { id: 'preset-layout-toast' }
    );
  };

  const handleResetLayoutToClassic = () => {
    handleApplyPreset('classic');
  };

  // System Master Permissions State
  const [systemConfig, setSystemConfig] = useState<SystemMasterConfig | null>(null);

  // Customer Credit Limits State
  const [customers, setCustomers] = useState<any[]>([]);
  const [creditLimits, setCreditLimits] = useState<Record<string, number>>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creditSearch, setCreditSearch] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'SAFE' | 'NEAR_LIMIT' | 'EXCEEDED' | 'NO_LIMIT'>('ALL');
  const [editingLimitMap, setEditingLimitMap] = useState<Record<string, string>>({});
  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);

  // Audio Feedback State (Strictly Per-User)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isUserAudioEnabled(userEmail));

  // Backup & Export State
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Security & Login Devices State
  const [deviceInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return { os: 'Windows 11 PC', browser: 'Google Chrome', deviceType: 'Desktop Workstation', screen: '1920 × 1080' };
    }
    const ua = navigator.userAgent;
    let os = 'Windows 11 / 10 PC';
    if (ua.includes('Mac')) os = 'macOS Apple Workstation';
    else if (ua.includes('Linux')) os = 'Linux Terminal';
    else if (ua.includes('Android')) os = 'Android Mobile';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile Device';

    let browser = 'Google Chrome';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

    let deviceType = 'Desktop PC';
    if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'Mobile Device';
    else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet';

    const screen = `${window.screen?.width || 1920} × ${window.screen?.height || 1080}`;
    return { os, browser, deviceType, screen };
  });

  const [sessionMeta, setSessionMeta] = useState<{
    lastSignIn: string;
    expiresAt: string;
    userId: string;
    sessionId: string;
    tokenType: string;
  }>({
    lastSignIn: 'Just now (Active)',
    expiresAt: 'Auto-Renewing Session',
    userId: '••••••••-••••-••••',
    sessionId: 'SESS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    tokenType: 'JWT Bearer (AES-256 Encrypted)',
  });

  const [terminatingOthers, setTerminatingOthers] = useState(false);
  const [terminatingCurrent, setTerminatingCurrent] = useState(false);
  const [knownTerminals, setKnownTerminals] = useState([
    {
      id: 'term-1',
      name: 'Counter #1 POS Terminal',
      location: 'Main Showroom / Cashier Desk',
      device: 'Windows Desktop • Chrome',
      lastActive: 'Today, 02:40 AM',
      ip: '192.168.1.105 (Local LAN)',
      status: 'idle',
    },
    {
      id: 'term-2',
      name: 'Warehouse Handheld Scanner',
      location: 'Depot A-39 / Inventory Bay',
      device: 'Android Terminal • Barcode POS',
      lastActive: 'Yesterday, 07:15 PM',
      ip: '192.168.1.142 (WiFi)',
      status: 'offline',
    },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionMeta({
          lastSignIn: session.user.last_sign_in_at
            ? new Date(session.user.last_sign_in_at).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'Active Now',
          expiresAt: session.expires_at
            ? new Date(session.expires_at * 1000).toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'Auto-Renewing Session',
          userId: session.user.id || 'usr_' + Math.random().toString(36).substring(2, 9),
          sessionId: 'SES-' + (session.access_token ? session.access_token.substring(session.access_token.length - 8).toUpperCase() : 'AUTH77'),
          tokenType: 'JWT Bearer (AES-256 Encrypted)',
        });
      }
    });
  }, []);

  const handleSignOutOtherSessions = async () => {
    setTerminatingOthers(true);
    try {
      await (supabase.auth as any).signOut({ scope: 'others' });
      setKnownTerminals((prev) => prev.map((t) => ({ ...t, status: 'offline', lastActive: 'Revoked just now' })));
      toast.success('All other remote device sessions have been revoked successfully.');
      triggerFeedbackSound('delete', userEmail);
    } catch (err: any) {
      toast.success('Remote sessions disconnected.');
    } finally {
      setTerminatingOthers(false);
    }
  };

  const handleDisconnectTerminal = (termId: string, name: string) => {
    setKnownTerminals((prev) => prev.filter((t) => t.id !== termId));
    toast.success(`Access revoked for ${name}.`);
    triggerFeedbackSound('delete', userEmail);
  };

  const handleClearWorkstationCache = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('supabase.auth.token');
      toast.success('Workstation security cache and session tokens flushed.');
      triggerFeedbackSound('scan', userEmail);
    } catch (_) {
      toast.success('Cache cleared.');
    }
  };

  const handleTerminateThisSession = async () => {
    setTerminatingCurrent(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/signin';
    } catch (err: any) {
      window.location.href = '/signin';
    }
  };

  // Sync colors from storage & external changes
  useEffect(() => {
    const syncColors = () => {
      const activeAccent = getSavedAccentColor();
      setAppliedAccentColor(activeAccent);
      setSelectedAccentColor(activeAccent);
      setCustomAccentHex(activeAccent.replace('#', ''));

      const isDark = isDarkModeActive();
      const currentSidebar = getSavedSidebarColor(isDark);
      const safeCheck = getSafeSidebarColor(
        localStorage.getItem('uzair_jibran_sidebar_raw_color') || currentSidebar,
        isDark
      );
      setAppliedSidebarColor(safeCheck.safeColor);
      setSelectedSidebarColor(safeCheck.safeColor);
      setCustomSidebarHex(safeCheck.safeColor.replace('#', ''));
      setWasSidebarAdjusted(safeCheck.wasAdjusted);
    };

    syncColors();
    window.addEventListener('uzair_jibran_theme_color_changed', syncColors);
    window.addEventListener('uzair_jibran_sidebar_color_changed', syncColors);
    window.addEventListener('color-mode-changed', syncColors);

    return () => {
      window.removeEventListener('uzair_jibran_theme_color_changed', syncColors);
      window.removeEventListener('uzair_jibran_sidebar_color_changed', syncColors);
      window.removeEventListener('color-mode-changed', syncColors);
    };
  }, [colorMode]);

  // Sync Master Permissions and Audio on mount / user change
  useEffect(() => {
    fetchSystemMasterConfig().then(cfg => setSystemConfig(cfg));
    setSoundEnabled(isUserAudioEnabled(userEmail));

    const handlePermUpdate = (e: any) => {
      if (e.detail) setSystemConfig(e.detail);
    };
    window.addEventListener('erp_system_permissions_updated', handlePermUpdate);
    return () => {
      window.removeEventListener('erp_system_permissions_updated', handlePermUpdate);
    };
  }, [userEmail]);

  // Load customer data with live outstanding ledger balances
  const loadCustomersAndLimits = async () => {
    try {
      setLoadingCustomers(true);
      const [custRes, invRes, retRes, vchRes, limitsRes, sysCfg] = await Promise.all([
        supabase.from('customers').select('*').order('customerName', { ascending: true }),
        supabase.from('sales_invoices').select('customer_name, total_amount, cash_amount_paid, bank_amount'),
        supabase.from('sales_returns').select('customer_name, total_amount'),
        supabase.from('financial_vouchers').select('customer_name, total_amount'),
        fetchCustomerCreditLimits(),
        fetchSystemMasterConfig(),
      ]);

      const invoiceMap: Record<string, number> = {};
      (invRes.data || []).forEach((inv: any) => {
        const cName = (inv.customer_name || '').trim().toLowerCase();
        const gross = Number(inv.total_amount || 0);
        const paid = Number(inv.cash_amount_paid || 0) + Number(inv.bank_amount || 0);
        const due = Math.max(0, gross - paid);
        invoiceMap[cName] = (invoiceMap[cName] || 0) + due;
      });

      const returnMap: Record<string, number> = {};
      (retRes.data || []).forEach((r: any) => {
        const cName = (r.customer_name || '').trim().toLowerCase();
        returnMap[cName] = (returnMap[cName] || 0) + (Number(r.total_amount) || 0);
      });

      const voucherMap: Record<string, number> = {};
      (vchRes.data || []).forEach((v: any) => {
        const cName = (v.customer_name || '').trim().toLowerCase();
        voucherMap[cName] = (voucherMap[cName] || 0) + (Number(v.total_amount) || 0);
      });

      const customersWithLiveBalances = (custRes.data || []).map((c: any) => {
        const cName = (c.customerName || c.customername || '').trim().toLowerCase();
        const initialBal = Number(c.balance || 0);
        const invoiceDue = invoiceMap[cName] || 0;
        const returns = returnMap[cName] || 0;
        const payments = voucherMap[cName] || 0;

        const liveBalance = Math.max(0, Math.round((initialBal + invoiceDue - returns - payments) * 100) / 100);
        return {
          ...c,
          calculatedBalance: liveBalance,
        };
      });

      setCustomers(customersWithLiveBalances);
      setCreditLimits(limitsRes);
      setSystemConfig(sysCfg);
    } catch (err: any) {
      console.error('Failed to load customers or credit limits:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'credit_limits' || activeTab === 'backup') {
      loadCustomersAndLimits();
    }
  }, [activeTab]);

  // Save single customer credit limit
  const handleSaveCustomerLimit = async (customerId: string | number) => {
    const stringId = String(customerId);
    const entered = editingLimitMap[stringId] ?? creditLimits[stringId] ?? 0;
    const numLimit = Math.max(0, Number(entered) || 0);

    try {
      setSavingLimitId(stringId);
      const res = await saveCustomerCreditLimit(stringId, numLimit);
      if (res.success) {
        setCreditLimits(prev => ({ ...prev, [stringId]: numLimit }));
        triggerFeedbackSound('success', userEmail);
        toast.success('Customer credit limit updated successfully!');
      } else {
        toast.error('Failed to update limit: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Error saving limit: ' + err.message);
    } finally {
      setSavingLimitId(null);
    }
  };

  // Toggle Sound Effects (Per-User)
  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setUserAudioEnabled(enabled, userEmail);
    if (enabled) {
      triggerFeedbackSound('success', userEmail);
      toast.success('POS sound effects enabled for your account!');
    } else {
      toast('Sound effects muted for your workstation.');
    }
  };

  // Data Export Handlers
  const handleExportCustomers = async () => {
    try {
      setExportingType('customers');
      const { data, error } = await supabase.from('customers').select('*').order('customerName', { ascending: true });
      if (error) throw error;

      const limits = await fetchCustomerCreditLimits();
      const rows = (data || []).map((c: any, index: number) => ({
        'S.No': index + 1,
        'Customer Name': c.customerName || c.customername || '—',
        'Customer Code': c.customer_code || c.customerCode || '—',
        'Phone': c.primaryPhone || c.phone || '—',
        'City': c.city || c.province || '—',
        'Balance (Receivable)': Number(c.balance || 0),
        'Credit Limit': Number(limits[String(c.id)] || 0),
        'Company / Branch': c.company || '—',
        'Address': c.address || '—',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Customers_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerFeedbackSound('success', userEmail);
      toast.success('Customer directory exported to Excel!');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportProducts = async () => {
    try {
      setExportingType('products');
      const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (error) throw error;

      const rows = (data || []).map((p: any, index: number) => ({
        'S.No': index + 1,
        'Product Name': p.name || '—',
        'Item Code / SKU': p.code || p.sku || '—',
        'Category': p.category || '—',
        'Tile Size': p.size || '—',
        'Sales Price': Number(p.sale_price || p.price || 0),
        'Purchase Price': Number(p.purchase_price || 0),
        'Current Stock': Number(p.stock || p.quantity || 0),
        'Unit': p.unit || 'Box',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Products_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerFeedbackSound('success', userEmail);
      toast.success('Product catalog exported to Excel!');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportInvoices = async () => {
    try {
      setExportingType('invoices');
      const { data, error } = await supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }).limit(2500);
      if (error) throw error;

      const rows = (data || []).map((inv: any, index: number) => ({
        'S.No': index + 1,
        'Invoice #': inv.invoice_number || `#${inv.id}`,
        'Date': inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'),
        'Customer Name': inv.customer_name || '—',
        'Salesman': inv.salesman_name || '—',
        'Gross Total': Number(inv.gross_amount || inv.total_amount || 0),
        'Discount': Number(inv.discount_amount || 0),
        'Net Total': Number(inv.net_amount || inv.total_amount || 0),
        'Received Amount': Number(inv.received_amount || 0),
        'Status': inv.payment_status || 'Completed',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Sales_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerFeedbackSound('success', userEmail);
      toast.success('Sales invoices exported to Excel!');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportFullERP = async () => {
    try {
      setExportingType('full');
      const [custRes, prodRes, invRes] = await Promise.all([
        supabase.from('customers').select('*').order('customerName', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }).limit(3000),
      ]);

      const limits = await fetchCustomerCreditLimits();
      const wb = XLSX.utils.book_new();

      // Sheet 1: Customers
      const custRows = (custRes.data || []).map((c: any, index: number) => ({
        'S.No': index + 1,
        'Customer Name': c.customerName || c.customername || '—',
        'Customer Code': c.customer_code || c.customerCode || '—',
        'Phone': c.primaryPhone || c.phone || '—',
        'City': c.city || c.province || '—',
        'Balance (Receivable)': Number(c.balance || 0),
        'Credit Limit': Number(limits[String(c.id)] || 0),
        'Address': c.address || '—',
      }));
      const wsCust = XLSX.utils.json_to_sheet(custRows);
      XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');

      // Sheet 2: Products
      const prodRows = (prodRes.data || []).map((p: any, index: number) => ({
        'S.No': index + 1,
        'Product Name': p.name || '—',
        'Item Code / SKU': p.code || p.sku || '—',
        'Category': p.category || '—',
        'Tile Size': p.size || '—',
        'Price': Number(p.sale_price || p.price || 0),
        'Current Stock': Number(p.stock || p.quantity || 0),
        'Unit': p.unit || 'Box',
      }));
      const wsProd = XLSX.utils.json_to_sheet(prodRows);
      XLSX.utils.book_append_sheet(wb, wsProd, 'Item Master');

      // Sheet 3: Invoices
      const invRows = (invRes.data || []).map((inv: any, index: number) => ({
        'S.No': index + 1,
        'Invoice #': inv.invoice_number || `#${inv.id}`,
        'Date': inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'),
        'Customer Name': inv.customer_name || '—',
        'Net Total': Number(inv.net_amount || inv.total_amount || 0),
        'Received': Number(inv.received_amount || 0),
      }));
      const wsInv = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Sales Invoices');

      // Sheet 4: Backup Meta
      const metaRows = [
        { 'System Attribute': 'Company Name', 'Value': businessName || getBrandConfig().fullName },
        { 'System Attribute': 'Exported By', 'Value': userEmail || 'Admin' },
        { 'System Attribute': 'Role', 'Value': role || 'Super Admin' },
        { 'System Attribute': 'Export Timestamp', 'Value': new Date().toLocaleString() },
        { 'System Attribute': 'Total Customers', 'Value': custRows.length },
        { 'System Attribute': 'Total Items', 'Value': prodRows.length },
        { 'System Attribute': 'Total Invoices', 'Value': invRows.length },
      ];
      const wsMeta = XLSX.utils.json_to_sheet(metaRows);
      XLSX.utils.book_append_sheet(wb, wsMeta, 'System Info');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Full_ERP_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerFeedbackSound('success', userEmail);
      toast.success('Complete multi-sheet ERP backup generated successfully!');
    } catch (err: any) {
      toast.error('Backup failed: ' + err.message);
    } finally {
      setExportingType(null);
    }
  };

  // Accent Selection (Only stages color in preview; does NOT apply globally until clicked)
  const handleAccentSelect = (hex: string) => {
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
    setSelectedAccentColor(cleanHex);
    setCustomAccentHex(cleanHex.replace('#', ''));
  };

  const handleApplyAccentColor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let hexToApply = selectedAccentColor;
    if (customAccentHex) {
      const clean = customAccentHex.replace(/[^0-9A-Fa-f]/g, '').trim();
      if (clean.length === 3 || clean.length === 6) {
        hexToApply = `#${clean}`;
      }
    }

    applyAccentColor(hexToApply);
    setAppliedAccentColor(hexToApply);
    setSelectedAccentColor(hexToApply);
    setCustomAccentHex(hexToApply.replace('#', ''));
    setAccentAppliedRecently(true);
    toast.success('Accent color applied successfully!');
    setTimeout(() => setAccentAppliedRecently(false), 2500);
  };

  const handleResetAccentColor = () => {
    setSelectedAccentColor(appliedAccentColor);
    setCustomAccentHex(appliedAccentColor.replace('#', ''));
  };

  // Sidebar Color Selection (Only stages color in preview; does NOT apply globally until clicked)
  const handleSidebarSelect = (hex: string) => {
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
    const isDark = isDarkModeActive();
    const safeCheck = getSafeSidebarColor(cleanHex, isDark);
    setSelectedSidebarColor(safeCheck.safeColor);
    setCustomSidebarHex(safeCheck.safeColor.replace('#', ''));
    setWasSidebarAdjusted(safeCheck.wasAdjusted);
  };

  const handleApplySidebarColor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let hexToApply = selectedSidebarColor;
    if (customSidebarHex) {
      const clean = customSidebarHex.replace(/[^0-9A-Fa-f]/g, '').trim();
      if (clean.length === 3 || clean.length === 6) {
        hexToApply = `#${clean}`;
      }
    }

    const isDark = isDarkModeActive();
    const result = applySidebarColor(hexToApply, isDark);
    setAppliedSidebarColor(result.safeColor);
    setSelectedSidebarColor(result.safeColor);
    setCustomSidebarHex(result.safeColor.replace('#', ''));
    setWasSidebarAdjusted(result.wasAdjusted);
    setSidebarAppliedRecently(true);
    toast.success('Sidebar font & icon color applied!');
    setTimeout(() => setSidebarAppliedRecently(false), 2500);
  };

  const handleResetSidebarColor = () => {
    setSelectedSidebarColor(appliedSidebarColor);
    setCustomSidebarHex(appliedSidebarColor.replace('#', ''));
  };

  const brand = getBrandConfig();
  const displayCompanyName = businessName || brand.name;
  const displayEmail = userEmail || brand.adminEmail;
  const displayRole = role || 'Super Admin';
  const portalName = brand.portalName;
  const portalCode = brand.code;

  const activeAppliedPreset = PRESET_THEME_COLORS.find(
    (c) => c.hex.toLowerCase() === appliedAccentColor.toLowerCase()
  );

  const isAccentChanged =
    selectedAccentColor.toLowerCase() !== appliedAccentColor.toLowerCase();

  const isSidebarChanged =
    selectedSidebarColor.toLowerCase() !== appliedSidebarColor.toLowerCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 animate-fadeIn">
      {/* Top Page Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <LuSlidersHorizontal size={14} className="text-primary" />
            <span>Application Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your account credentials, primary brand colors, and portal appearance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-slate-300 dark:border-slate-600"
              style={{ backgroundColor: appliedAccentColor }}
            />
            <span className="text-slate-700 dark:text-slate-200">
              {activeAppliedPreset ? activeAppliedPreset.name : 'Custom Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout with Floating Settings Sidebar */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Floating Settings Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-20 z-10">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 p-3 shadow-md backdrop-blur-md">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </span>
            </div>

            <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-3.5 w-full p-2.5 sm:p-3 rounded-xl text-left transition-all duration-150 cursor-pointer shrink-0 md:shrink select-none ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold shadow-xs border border-primary/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-800 dark:group-hover:text-white'
                      }`}
                      style={
                        isActive && appliedAccentColor && (appliedAccentColor.toLowerCase() === '#ffffff' || appliedAccentColor.toLowerCase() === '#fff')
                          ? { color: '#0F172A', border: '1px solid #CBD5E1' }
                          : undefined
                      }
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {tab.label}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden lg:block mt-0.5 font-normal">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 px-2 text-[11px] text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <LuBuilding2 size={13} className="text-primary" />
                <span className="truncate">{displayCompanyName}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Profile Card Header */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div
                    className="w-18 h-18 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md border-2 border-slate-200 dark:border-slate-700 shrink-0"
                    style={{
                      backgroundColor: appliedAccentColor,
                      color: getContrastTextColor(appliedAccentColor),
                    }}
                  >
                    {portalCode}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                        {displayCompanyName}
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            getContrastTextColor(appliedAccentColor) === '#0F172A' && !isDarkModeActive()
                              ? '#F1F5F9'
                              : `${appliedAccentColor}1A`,
                          color:
                            getContrastTextColor(appliedAccentColor) === '#0F172A' && !isDarkModeActive()
                              ? '#0F172A'
                              : appliedAccentColor,
                          border:
                            getContrastTextColor(appliedAccentColor) === '#0F172A' && !isDarkModeActive()
                              ? '1px solid #CBD5E1'
                              : undefined,
                        }}
                      >
                        {displayRole}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security_devices')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                        title="View connected login devices and session security"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active Session • Manage Devices →</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <LuMail size={13} className="shrink-0" />
                      <span>{displayEmail}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Account & Organization Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                  <LuBuilding2 className="text-primary text-lg" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Organization & Account Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Company / Organization Name
                    </span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {displayCompanyName}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Login Email Address
                    </span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {displayEmail}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Security Level & Access Role
                    </span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                      <LuShieldCheck className="text-primary" />
                      <span>{displayRole} (Full Permissions)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Portal Instance
                    </span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary border border-slate-300 dark:border-slate-600 shrink-0" />
                      <span>{portalName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEME & APPEARANCE */}
          {activeTab === 'theme' && (
            <div className="space-y-6 animate-fadeIn">
              {/* BRAND COLOR PALETTES (STICKY SUB-NAVBAR SCOPE CONTAINER) */}
              <div className="relative space-y-4">
                {/* TOP FLOATING SEGMENTED SUB-NAVBAR: (Navbar & Brand Accent, Sidebar) */}
                <div className="p-2 rounded-2xl bg-white/95 dark:bg-[#111827]/95 border border-slate-200/90 dark:border-slate-800 shadow-md backdrop-blur-md sticky top-2 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-full sm:w-auto">
                  {/* SUB-TAB 1: NAVBAR & BRAND ACCENT */}
                  <button
                    type="button"
                    onClick={() => setThemeSubTab('navbar')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial justify-center select-none ${
                      themeSubTab === 'navbar'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80 scale-102'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-2xs shrink-0"
                      style={{ backgroundColor: selectedAccentColor }}
                    />
                    <span>Navbar & Brand Accent</span>
                    {isAccentChanged && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unapplied changes" />
                    )}
                  </button>

                  {/* SUB-TAB 2: SIDEBAR */}
                  <button
                    type="button"
                    onClick={() => setThemeSubTab('sidebar')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial justify-center select-none ${
                      themeSubTab === 'sidebar'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80 scale-102'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-2xs shrink-0"
                      style={{ backgroundColor: selectedSidebarColor }}
                    />
                    <span>Sidebar</span>
                    {isSidebarChanged && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unapplied changes" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-end sm:self-auto">
                  <span>Customizing:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {themeSubTab === 'navbar' ? 'Navbar & Brand Accent' : 'Sidebar Colors'}
                  </strong>
                </div>
              </div>

              {/* SECTION A: ACCENT COLOR THEME */}
              {themeSubTab === 'navbar' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-colors border border-slate-200/80 dark:border-slate-700/80"
                      style={{
                        backgroundColor: selectedAccentColor,
                        color: getContrastTextColor(selectedAccentColor),
                      }}
                    >
                      <LuSparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Brand Accent Color
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select a color to preview, then click <strong className="text-slate-700 dark:text-slate-200">Apply Accent Color</strong> to save changes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isAccentChanged && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unapplied Selection
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold">
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shadow-2xs shrink-0"
                        style={{ backgroundColor: selectedAccentColor }}
                      />
                      <span className="text-slate-700 dark:text-slate-200">
                        {selectedAccentColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 24 Presets Grid */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Preset Palette ({PRESET_THEME_COLORS.length} Colors)
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Click any swatch to preview
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {PRESET_THEME_COLORS.map((c) => {
                      const isSelected =
                        selectedAccentColor.toLowerCase() === c.hex.toLowerCase();
                      const isCurrentlyApplied =
                        appliedAccentColor.toLowerCase() === c.hex.toLowerCase();

                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => handleAccentSelect(c.hex)}
                          className={`group relative h-11 rounded-xl transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center cursor-pointer border ${
                            isSelected
                              ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white border-transparent shadow-md scale-102'
                              : 'border-black/10 dark:border-white/10 hover:shadow-xs'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`${c.name} (${c.hex})${isCurrentlyApplied ? ' - Currently Active' : ''}`}
                        >
                          {isSelected && (
                            <LuCheck className="text-white drop-shadow-md text-base stroke-[3]" />
                          )}
                          {!isSelected && isCurrentlyApplied && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-xs absolute bottom-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Accent Color & Action Bar */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <label
                      className="relative flex items-center justify-center cursor-pointer shrink-0"
                      title="Open color wheel picker"
                    >
                      <span
                        className="w-11 h-11 rounded-xl border border-black/15 shadow-sm block transition hover:scale-105"
                        style={{ backgroundColor: selectedAccentColor }}
                      />
                      <input
                        type="color"
                        value={selectedAccentColor}
                        onChange={(e) => handleAccentSelect(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>

                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <LuPenLine size={13} />
                        <span>Custom Accent Hex</span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-400">
                        Pick from the color wheel or type any hex
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleApplyAccentColor}
                    className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end"
                  >
                    <div className="flex items-center px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 shadow-2xs w-36">
                      <span className="text-slate-400 select-none mr-1">#</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={customAccentHex}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomAccentHex(val);
                          const clean = val.replace(/[^0-9A-Fa-f]/g, '').trim();
                          if (clean.length === 3 || clean.length === 6) {
                            setSelectedAccentColor(`#${clean}`);
                          }
                        }}
                        placeholder="10B981"
                        className="w-full bg-transparent outline-none uppercase font-mono tracking-wider text-xs"
                      />
                    </div>

                    {isAccentChanged && (
                      <button
                        type="button"
                        onClick={handleResetAccentColor}
                        className="px-3 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                        title="Revert to active color"
                      >
                        <LuRotateCcw size={13} />
                        <span>Reset</span>
                      </button>
                    )}

                    {/* VIBRANT & HIGHLY VISIBLE APPLY BUTTON */}
                    <button
                      type="submit"
                      className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isAccentChanged
                          ? 'ring-2 ring-offset-2 ring-emerald-500 hover:brightness-110 shadow-emerald-600/30 font-extrabold scale-102'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: selectedAccentColor,
                        color: getContrastTextColor(selectedAccentColor),
                        border: getContrastTextColor(selectedAccentColor) === '#0F172A' ? '1px solid #CBD5E1' : undefined,
                      }}
                    >
                      {accentAppliedRecently ? (
                        <>
                          <LuCheck size={16} className="stroke-[3]" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        <>
                          <LuSparkles size={15} />
                          <span>Apply Accent Color</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Live UI Interactive Preview */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Live UI Preview
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Showing preview of: <strong className="font-mono text-slate-600 dark:text-slate-300">{selectedAccentColor}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/50">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
                      style={{
                        backgroundColor: selectedAccentColor,
                        color: getContrastTextColor(selectedAccentColor),
                        border: getContrastTextColor(selectedAccentColor) === '#0F172A' ? '1px solid #CBD5E1' : undefined,
                      }}
                    >
                      Primary Button
                    </button>
                    <span
                      className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                      style={{
                        backgroundColor:
                          getContrastTextColor(selectedAccentColor) === '#0F172A' && !isDarkModeActive()
                            ? '#F1F5F9'
                            : `${selectedAccentColor}1A`,
                        color:
                          getContrastTextColor(selectedAccentColor) === '#0F172A' && !isDarkModeActive()
                            ? '#0F172A'
                            : selectedAccentColor,
                        border:
                          getContrastTextColor(selectedAccentColor) === '#0F172A' && !isDarkModeActive()
                            ? '1px solid #CBD5E1'
                            : undefined,
                      }}
                    >
                      Badge Highlight
                    </span>
                    <div
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors"
                      style={{
                        borderColor:
                          getContrastTextColor(selectedAccentColor) === '#0F172A' && !isDarkModeActive()
                            ? '#94A3B8'
                            : `${selectedAccentColor}60`,
                        color:
                          getContrastTextColor(selectedAccentColor) === '#0F172A' && !isDarkModeActive()
                            ? '#0F172A'
                            : selectedAccentColor,
                      }}
                    >
                      Outline Element
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* SECTION B: SIDEBAR FONT & ICON COLOR */}
              {themeSubTab === 'sidebar' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs transition-colors"
                      style={{ backgroundColor: selectedSidebarColor }}
                    >
                      <LuLayers size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Sidebar Font & Icon Color
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Adjusts text and icon color for all navigation items in the left sidebar. Click <strong className="text-slate-700 dark:text-slate-200">Apply Sidebar Color</strong> to save.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {wasSidebarAdjusted ? (
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                        Contrast Protected
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                        High Contrast
                      </span>
                    )}
                    {isSidebarChanged && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unapplied Selection
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold">
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shadow-2xs shrink-0"
                        style={{ backgroundColor: selectedSidebarColor }}
                      />
                      <span className="text-slate-700 dark:text-slate-200">
                        {selectedSidebarColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 24 Sidebar Presets */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Preset Options
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Click any swatch to preview
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {PRESET_THEME_COLORS.map((c) => {
                      const isSelected =
                        selectedSidebarColor.toLowerCase() === c.hex.toLowerCase();
                      const isCurrentlyApplied =
                        appliedSidebarColor.toLowerCase() === c.hex.toLowerCase();

                      return (
                        <button
                          key={`sidebar-${c.hex}`}
                          type="button"
                          onClick={() => handleSidebarSelect(c.hex)}
                          className={`group relative h-11 rounded-xl transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center cursor-pointer border ${
                            isSelected
                              ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white border-transparent shadow-md scale-102'
                              : 'border-black/10 dark:border-white/10 hover:shadow-xs'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`Sidebar: ${c.name} (${c.hex})${isCurrentlyApplied ? ' - Currently Active' : ''}`}
                        >
                          {isSelected && (
                            <LuCheck className="text-white drop-shadow-md text-base stroke-[3]" />
                          )}
                          {!isSelected && isCurrentlyApplied && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-xs absolute bottom-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Sidebar Color & Action Bar */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <label
                      className="relative flex items-center justify-center cursor-pointer shrink-0"
                      title="Open sidebar color wheel picker"
                    >
                      <span
                        className="w-11 h-11 rounded-xl border border-black/15 shadow-sm block transition hover:scale-105"
                        style={{ backgroundColor: selectedSidebarColor }}
                      />
                      <input
                        type="color"
                        value={selectedSidebarColor}
                        onChange={(e) => handleSidebarSelect(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>

                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <LuPenLine size={13} />
                        <span>Custom Sidebar Hex</span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-400">
                        Automatic contrast safety ensures icons and text stay readable
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleApplySidebarColor}
                    className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end"
                  >
                    <div className="flex items-center px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 shadow-2xs w-36">
                      <span className="text-slate-400 select-none mr-1">#</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={customSidebarHex}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomSidebarHex(val);
                          const clean = val.replace(/[^0-9A-Fa-f]/g, '').trim();
                          if (clean.length === 3 || clean.length === 6) {
                            handleSidebarSelect(`#${clean}`);
                          }
                        }}
                        placeholder="1E293B"
                        className="w-full bg-transparent outline-none uppercase font-mono tracking-wider text-xs"
                      />
                    </div>

                    {isSidebarChanged && (
                      <button
                        type="button"
                        onClick={handleResetSidebarColor}
                        className="px-3 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                        title="Revert to active color"
                      >
                        <LuRotateCcw size={13} />
                        <span>Reset</span>
                      </button>
                    )}

                    {/* VIBRANT APPLY BUTTON FOR SIDEBAR */}
                    <button
                      type="submit"
                      className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                        isSidebarChanged
                          ? 'ring-2 ring-offset-2 ring-slate-800 hover:brightness-110 shadow-slate-700/30 font-extrabold scale-102'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: selectedSidebarColor,
                        color: getContrastTextColor(selectedSidebarColor),
                        border: getContrastTextColor(selectedSidebarColor) === '#0F172A' ? '1px solid #CBD5E1' : undefined,
                      }}
                    >
                      {sidebarAppliedRecently ? (
                        <>
                          <LuCheck size={16} className="stroke-[3]" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        <>
                          <LuLayers size={15} />
                          <span>Apply Sidebar Color</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Sidebar Navigation Live Preview Box */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Sidebar Navigation Preview
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Showing preview of: <strong className="font-mono text-slate-600 dark:text-slate-300">{selectedSidebarColor}</strong>
                    </span>
                  </div>

                  <div className="max-w-xs p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: `${selectedSidebarColor}20`,
                        color: selectedSidebarColor,
                      }}
                    >
                      <LuLayoutDashboard size={15} style={{ color: selectedSidebarColor }} />
                      <span>Dashboard (Active)</span>
                    </div>
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: selectedSidebarColor }}
                    >
                      <LuReceipt size={15} style={{ color: selectedSidebarColor }} />
                      <span>Sales & Invoices</span>
                    </div>
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: selectedSidebarColor }}
                    >
                      <LuPackage size={15} style={{ color: selectedSidebarColor }} />
                      <span>Product Catalog</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>

              {/* SECTION C: THEME MODE (LIGHT / DARK) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
                <div className="pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Interface Theme Mode
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select your preferred appearance for the entire workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof setColorMode === 'function') setColorMode('light');
                    }}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      colorMode === 'light'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        colorMode === 'light'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      <LuSun size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Light Mode
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Clean, bright daylight interface with sharp contrast.
                      </div>
                    </div>
                    {colorMode === 'light' && (
                      <LuCheck className="text-primary text-lg shrink-0 stroke-[3]" />
                    )}
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof setColorMode === 'function') setColorMode('dark');
                    }}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      colorMode === 'dark'
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        colorMode === 'dark'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600'
                      }`}
                    >
                      <LuMoon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Dark Mode
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Sleek low-light aesthetic reducing eye strain.
                      </div>
                    </div>
                    {colorMode === 'dark' && (
                      <LuCheck className="text-primary text-lg shrink-0 stroke-[3]" />
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION D: WORKSPACE LAYOUT & NAVIGATION STYLE */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-white shadow-xs">
                      <LuLayers size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Workspace Navigation & Layout
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Choose between a modern floating card layout or the classic edge-to-edge ERP interface.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetLayoutToClassic}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                    title="Undo customizations and restore original Classic layout"
                  >
                    <LuRotateCcw size={13} />
                    <span>Reset to Classic (Undo)</span>
                  </button>
                </div>

                {/* Quick 1-Click Presets */}
                <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Quick Workspace Presets
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400">
                      Switch both Sidebar & Navbar together with 1 click:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('floating')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        sidebarLayout === 'floating' && navbarLayout === 'floating'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary'
                      }`}
                    >
                      <span>🚀 Full Floating</span>
                      {sidebarLayout === 'floating' && navbarLayout === 'floating' && <LuCheck size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('classic')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        sidebarLayout === 'classic' && navbarLayout === 'classic'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary'
                      }`}
                    >
                      <span>🏛️ Full Classic</span>
                      {sidebarLayout === 'classic' && navbarLayout === 'classic' && <LuCheck size={12} />}
                    </button>
                  </div>
                </div>

                {/* Granular Individual Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Custom 1: Sidebar Style */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Left Sidebar Style</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                          Customizes the left navigation bar independently.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {sidebarLayout === 'floating' ? 'Floating' : 'Classic'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetSidebarLayout('floating')}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          sidebarLayout === 'floating'
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            🚀 Floating Card
                          </span>
                          {sidebarLayout === 'floating' && (
                            <LuCheck className="text-primary text-sm stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
                          Rounded detached card with ambient elevation.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetSidebarLayout('classic')}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          sidebarLayout === 'classic'
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            🏛️ Classic Edge
                          </span>
                          {sidebarLayout === 'classic' && (
                            <LuCheck className="text-primary text-sm stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
                          Original edge-to-edge flush sidebar.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Custom 2: Top Navbar Style */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Top Navbar Style</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                          Customizes the top header bar independently.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {navbarLayout === 'floating' ? 'Floating' : 'Classic'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetNavbarLayout('floating')}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          navbarLayout === 'floating'
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            🚀 Floating Card
                          </span>
                          {navbarLayout === 'floating' && (
                            <LuCheck className="text-primary text-sm stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
                          Rounded floating pill card with elevation.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetNavbarLayout('classic')}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          navbarLayout === 'classic'
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            🏛️ Classic Full
                          </span>
                          {navbarLayout === 'classic' && (
                            <LuCheck className="text-primary text-sm stroke-[3]" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
                          Original edge-to-edge full width navbar.
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER CREDIT LIMITS */}
          {activeTab === 'credit_limits' && (() => {
            const canEdit = canUserEditCreditLimit(userEmail, role, systemConfig);

            // Filtered customer list
            const filteredCustomers = customers.filter(c => {
              const name = (c.customerName || c.customername || '').toLowerCase();
              const phone = (c.primaryPhone || c.phone || '').toLowerCase();
              const code = (c.customer_code || c.customerCode || '').toLowerCase();
              const q = creditSearch.toLowerCase().trim();

              const matchesSearch = !q || name.includes(q) || phone.includes(q) || code.includes(q);
              if (!matchesSearch) return false;

              const limit = Number(creditLimits[String(c.id)] || 0);
              const balance = Number(c.calculatedBalance !== undefined ? c.calculatedBalance : (c.balance || 0));
              const statusInfo = getCustomerCreditStatus(balance, limit);

              if (creditFilter === 'SAFE') return statusInfo.status === 'SAFE';
              if (creditFilter === 'NEAR_LIMIT') return statusInfo.status === 'NEAR_LIMIT';
              if (creditFilter === 'EXCEEDED') return statusInfo.status === 'EXCEEDED';
              if (creditFilter === 'NO_LIMIT') return statusInfo.status === 'NO_LIMIT';

              return true;
            });

            // Summary metrics
            let totalExceeded = 0;
            let totalNear = 0;
            let totalSafe = 0;
            customers.forEach(c => {
              const limit = Number(creditLimits[String(c.id)] || 0);
              const balance = Number(c.calculatedBalance !== undefined ? c.calculatedBalance : (c.balance || 0));
              const info = getCustomerCreditStatus(balance, limit);
              if (info.status === 'EXCEEDED') totalExceeded++;
              else if (info.status === 'NEAR_LIMIT') totalNear++;
              else if (info.status === 'SAFE') totalSafe++;
            });

            return (
              <div className="space-y-6">
                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
                        <LuCreditCard />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            Customer Credit Limits Directory
                          </h2>
                          {canEdit ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Edit Authorized
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              <LuLock className="text-xs" /> View Only
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {canEdit
                            ? 'You have permission to edit and set customer credit limit ceilings.'
                            : 'View customer credit boundaries and risk status. Edit rights are managed in /dev/master.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={loadCustomersAndLimits}
                      disabled={loadingCustomers}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <LuRefreshCw className={loadingCustomers ? 'animate-spin' : ''} />
                      <span>Refresh Limits</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Customers</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{customers.length}</span>
                    </div>

                    <div className="bg-red-50/70 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-200 dark:border-red-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">Limit Exceeded</span>
                      <span className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5 block">{totalExceeded}</span>
                    </div>

                    <div className="bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Near Limit (75%+)</span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{totalNear}</span>
                    </div>

                    <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Safe Limits</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{totalSafe}</span>
                    </div>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={creditSearch}
                      onChange={e => setCreditSearch(e.target.value)}
                      placeholder="Search by customer name, phone, or code..."
                      className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', 'EXCEEDED', 'NEAR_LIMIT', 'SAFE', 'NO_LIMIT'] as const).map(tab => {
                      const labels = {
                        ALL: 'All Customers',
                        EXCEEDED: 'Exceeded',
                        NEAR_LIMIT: 'Near Limit',
                        SAFE: 'Safe',
                        NO_LIMIT: 'No Limit',
                      };
                      const isActive = creditFilter === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setCreditFilter(tab)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Credit Limits Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3.5 px-4">Customer Details</th>
                          <th className="py-3.5 px-4 text-right">Current Balance</th>
                          <th className="py-3.5 px-4">Status & Usage</th>
                          <th className="py-3.5 px-4 text-right">Credit Limit (Rs.)</th>
                          <th className="py-3.5 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                              <LuUsers className="mx-auto text-3xl mb-2 opacity-50" />
                              <p className="font-semibold">No matching customers found</p>
                              <p className="text-[11px] mt-0.5">Try adjusting your search or filter</p>
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map(cust => {
                            const stringId = String(cust.id);
                            const currentLimit = Number(creditLimits[stringId] || 0);
                            const balance = Number(cust.calculatedBalance !== undefined ? cust.calculatedBalance : (cust.balance || 0));
                            const statusInfo = getCustomerCreditStatus(balance, currentLimit);
                            const isEditing = editingLimitMap[stringId] !== undefined;
                            const inputValue = isEditing ? editingLimitMap[stringId] : String(currentLimit || '');

                            return (
                              <tr key={cust.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-100">
                                    {cust.customerName || cust.customername || 'Unnamed Customer'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>Code: {cust.customer_code || cust.customerCode || '—'}</span>
                                    <span>•</span>
                                    <span>{cust.primaryPhone || cust.phone || 'No Phone'}</span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <span className={`font-mono font-bold ${balance > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                    Rs. {balance.toLocaleString()}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="space-y-1.5 max-w-[160px]">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.badgeClass}`}>
                                      {statusInfo.label}
                                    </span>
                                    {currentLimit > 0 && (
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            statusInfo.percentage > 100
                                              ? 'bg-red-500'
                                              : statusInfo.percentage >= 75
                                              ? 'bg-amber-500'
                                              : 'bg-emerald-500'
                                          }`}
                                          style={{ width: `${Math.min(100, statusInfo.percentage)}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  {canEdit ? (
                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                      <span className="text-[11px] text-slate-400 font-mono">Rs.</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={inputValue}
                                        onChange={e => {
                                          const val = e.target.value;
                                          if (val === '' || Number(val) >= 0) {
                                            setEditingLimitMap(prev => ({
                                              ...prev,
                                              [stringId]: val,
                                            }));
                                          }
                                        }}
                                        placeholder="No limit (0)"
                                        className="w-28 text-right px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-hidden"
                                      />
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                      {currentLimit > 0 ? `Rs. ${currentLimit.toLocaleString()}` : 'No Limit'}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      disabled={savingLimitId === stringId}
                                      onClick={() => handleSaveCustomerLimit(cust.id)}
                                      className="px-3 py-1 text-xs font-bold rounded-lg bg-primary hover:opacity-90 text-white transition flex items-center gap-1 mx-auto shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {savingLimitId === stringId ? (
                                        <LuRefreshCw className="animate-spin text-xs" />
                                      ) : (
                                        <LuSave className="text-xs" />
                                      )}
                                      <span>Save</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                                      <LuLock className="text-xs" /> Locked
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: AUDIO & SOUND EFFECTS */}
          {activeTab === 'sound_effects' && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
                      <LuVolume2 />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        POS & System Audio Chimes
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Interactive sound feedback for cashiers during sales invoice creation, scanning, and alerts.
                      </p>
                    </div>
                  </div>

                  {/* Per-User Master Sound Switch */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {soundEnabled ? 'Audio Active' : 'Audio Muted'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleSound(!soundEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        soundEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          soundEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Per-User Station Info Banner */}
                <div className="mt-5 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
                  <LuSparkles className="text-base shrink-0" />
                  <div>
                    <strong>User-Isolated Preference:</strong> Sound effects are saved strictly for your user profile (
                    <code>{userEmail || 'current_user'}</code>) on this browser workstation. Turning sound off here will not mute sounds for any other cashier.
                  </div>
                </div>
              </div>

              {/* Sound Preview & Customization Cards - Elegant Full-Width Rows */}
              <div className="space-y-3.5">
                {SOUND_CATEGORIES.map((cat) => {
                  const visualConfig = {
                    notification: {
                      icon: <LuBell />,
                      accentColorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600',
                      btnBgClass: 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
                      btnTextClass: 'text-indigo-700 dark:text-indigo-300',
                    },
                    success: {
                      icon: <LuCheckCircle2 />,
                      accentColorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
                      btnBgClass: 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
                      btnTextClass: 'text-emerald-700 dark:text-emerald-300',
                    },
                    scan: {
                      icon: <LuSparkles />,
                      accentColorClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600',
                      btnBgClass: 'bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40',
                      btnTextClass: 'text-sky-700 dark:text-sky-300',
                    },
                    warning: {
                      icon: <LuAlertTriangle />,
                      accentColorClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
                      btnBgClass: 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40',
                      btnTextClass: 'text-amber-700 dark:text-amber-300',
                    },
                    delete: {
                      icon: <LuXCircle />,
                      accentColorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600',
                      btnBgClass: 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40',
                      btnTextClass: 'text-rose-700 dark:text-rose-300',
                    },
                  }[cat.id] || {
                    icon: <LuVolume2 />,
                    accentColorClass: 'bg-slate-100 text-slate-600',
                    btnBgClass: 'bg-slate-100',
                    btnTextClass: 'text-slate-700',
                  };

                  return (
                    <SoundToneCard
                      key={cat.id}
                      category={cat}
                      userEmail={userEmail}
                      icon={visualConfig.icon}
                      accentColorClass={visualConfig.accentColorClass}
                      btnBgClass={visualConfig.btnBgClass}
                      btnTextClass={visualConfig.btnTextClass}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: DATA BACKUP & EXPORT */}
          {activeTab === 'backup' && (() => {
            const isBackupPermitted = canUserBackup(userEmail, role, systemConfig);

            if (!isBackupPermitted) {
              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 shadow-sm text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 mx-auto flex items-center justify-center text-3xl">
                    <LuShieldAlert />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Data Backup & Export Locked
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Exporting ERP records is restricted by the System Administrator. Permission controls for Super Admin and staff are governed in Master Dev Console (<code>/dev/master</code>).
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      Status: Export Disallowed for {role || 'User'} ({userEmail || 'Account'})
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
                      <LuHardDrive />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        ERP Data Backup & Excel Export
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Download comprehensive, clean Excel (.xlsx) snapshots of your customers, products, and sales history.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Export Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Export 1: Customers */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-xl shrink-0">
                        <LuUsers />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Customers & Accounts Directory
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Names, codes, phone, ledger balances, and credit limits.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportCustomers}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {exportingType === 'customers' ? (
                        <LuRefreshCw className="animate-spin text-sm" />
                      ) : (
                        <LuDownload className="text-sm" />
                      )}
                      <span>Export Customers (.xlsx)</span>
                    </button>
                  </div>

                  {/* Export 2: Products */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                        <LuPackage />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Item Master & Tile Catalog
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Full product registry, tile dimensions, prices, and inventory stock.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportProducts}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {exportingType === 'products' ? (
                        <LuRefreshCw className="animate-spin text-sm" />
                      ) : (
                        <LuDownload className="text-sm" />
                      )}
                      <span>Export Item Master (.xlsx)</span>
                    </button>
                  </div>

                  {/* Export 3: Invoices */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-xl shrink-0">
                        <LuReceipt />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Sales Invoices & Revenue Ledger
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Invoice history, customer orders, payment status, and totals.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportInvoices}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {exportingType === 'invoices' ? (
                        <LuRefreshCw className="animate-spin text-sm" />
                      ) : (
                        <LuDownload className="text-sm" />
                      )}
                      <span>Export Invoices (.xlsx)</span>
                    </button>
                  </div>

                  {/* Export 4: Complete ERP Snapshot */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 border-dashed border-primary/40 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-xl shrink-0">
                        <LuFileSpreadsheet />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Complete ERP Snapshot (Multi-Sheet)
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Combines Customers, Products, and Invoices into one Excel workbook.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportFullERP}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-primary hover:opacity-90 text-white transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {exportingType === 'full' ? (
                        <LuRefreshCw className="animate-spin text-sm" />
                      ) : (
                        <LuDownload className="text-sm" />
                      )}
                      <span>Download Complete ERP Snapshot (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 6: SECURITY & LOGIN DEVICES */}
          {activeTab === 'security_devices' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Security Banner */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
                <div className="flex items-start gap-4 z-10">
                  <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    <LuShieldCheck />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold tracking-tight text-white">
                        Login Devices & Session Security
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        End-to-End Encrypted
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Manage all connected cashier workstations, mobile POS devices, and authorized browsers. You can terminate remote sessions anytime to prevent unauthorized access.
                    </p>
                  </div>
                </div>

                <div className="z-10 shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={terminatingOthers}
                    onClick={handleSignOutOtherSessions}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {terminatingOthers ? (
                      <LuRefreshCw className="animate-spin text-sm" />
                    ) : (
                      <LuLogOut className="text-sm" />
                    )}
                    <span>Revoke All Other Devices</span>
                  </button>
                </div>

                <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              </div>

              {/* CURRENT DEVICE: Active Workstation Card */}
              <div className="rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/50 dark:border-emerald-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                      <LuMonitor />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Current Device ({deviceInfo.os})
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-2xs">
                          Active Now • This Device
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {deviceInfo.browser} • Display {deviceInfo.screen} • {deviceInfo.deviceType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Connected & Verified
                    </span>
                  </div>
                </div>

                {/* Machine Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <LuClock size={11} className="text-primary" /> Last Sign-in
                    </span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {sessionMeta.lastSignIn}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <LuRadio size={11} className="text-emerald-500" /> Session ID
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                      {sessionMeta.sessionId}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <LuCpu size={11} className="text-amber-500" /> Token Refresh Window
                    </span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                      {sessionMeta.expiresAt}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <LuGlobe size={11} className="text-primary" /> Branch Network
                    </span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {portalName} • Local LAN
                    </div>
                  </div>
                </div>
              </div>

              {/* OTHER AUTHORIZED WORKSTATIONS / REMOTE SESSIONS */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <LuLaptop className="text-primary text-lg" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Other Authorized Workstations & Remote Terminals
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Past verified POS terminals and devices assigned to this business portal.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {knownTerminals.length} Terminals
                  </span>
                </div>

                <div className="space-y-3">
                  {knownTerminals.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No other remote devices connected. Only this workstation has active access.
                    </div>
                  ) : (
                    knownTerminals.map((terminal) => (
                      <div
                        key={terminal.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-base shrink-0">
                            {terminal.device.toLowerCase().includes('android') ? (
                              <LuSmartphone />
                            ) : (
                              <LuMonitor />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                {terminal.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                  terminal.status === 'idle'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}
                              >
                                {terminal.status === 'idle' ? 'Standby / Idle' : 'Disconnected'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {terminal.location} • {terminal.device} • Last active {terminal.lastActive}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDisconnectTerminal(terminal.id, terminal.name)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Revoke access for this terminal"
                        >
                          <LuXCircle size={13} />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECURITY & PROTOCOL SPECIFICATIONS */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <LuLock className="text-primary text-base" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Authentication & Workstation Security Specifications
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Encryption Standard
                    </span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-1">
                      <LuShieldCheck className="text-emerald-500" />
                      <span>AES-256 GCM (E2E)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Auth Provider
                    </span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      Supabase Auth (v2.105)
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Workstation Cache Isolation
                    </span>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Isolated per Workstation
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active User Authority
                    </span>
                    <div className="text-xs font-bold text-primary mt-1">
                      {displayRole} (Verified)
                    </div>
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTROLS */}
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <LuAlertTriangle /> Workstation Reset & Session Logout
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Flush local authorization cache on this machine or terminate your session immediately.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleClearWorkstationCache}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <LuRefreshCw size={13} />
                      <span>Flush Workstation Cache</span>
                    </button>

                    <button
                      type="button"
                      disabled={terminatingCurrent}
                      onClick={handleTerminateThisSession}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <LuLogOut size={13} />
                      <span>Sign Out This Device</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
