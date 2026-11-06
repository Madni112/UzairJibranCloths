import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { AiOutlineUp, AiOutlineDown, AiOutlineRight, AiOutlineArrowLeft } from 'react-icons/ai';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { LuLogOut, LuSlidersHorizontal } from 'react-icons/lu';
import { useModal } from '../../Context/Modal';
import { useAuth } from '../../Context/Auth';
import { useLanguage, getUrduText } from '../../Context/LanguageContext';
import {
  PRESET_THEME_COLORS,
  applySidebarColor,
  getSavedSidebarColor,
  getSafeSidebarColor,
  SidebarLayoutMode,
  getSidebarLayoutMode,
  getSidebarBehaviorMode,
  SidebarBehaviorMode,
  getSidebarBgTheme,
  getContrastTextColor,
  getSavedAccentColor,
} from '../../constant/themeConfig';
import { getBrandConfig } from '../../utils/brand';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';

const getSidebarLabel = (label: string, isRTL: boolean) => {
  if (isRTL) {
    return getUrduText(label);
  }
  return label;
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean | ((prev: boolean) => boolean)) => void;
}

// Collapsed hover nested flyout component
const FlyoutSubMenu = ({
  item,
  pathname,
  handleLinkClick,
  getTenantPath,
  sidebarColor,
  isLightSidebar,
  sidebarBg,
  sidebarBorderColor,
}: any) => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [showSubFlyout, setShowSubFlyout] = useState(false);
  const subCloseTimerRef = useRef<any>(null);

  const cancelSubClose = () => {
    if (subCloseTimerRef.current) {
      clearTimeout(subCloseTimerRef.current);
      subCloseTimerRef.current = null;
    }
  };

  const scheduleSubClose = () => {
    cancelSubClose();
    subCloseTimerRef.current = setTimeout(() => {
      setShowSubFlyout(false);
    }, 250);
  };

  useEffect(() => {
    return () => cancelSubClose();
  }, []);

  const destination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';
  const isActive = item.path && (pathname === destination || pathname === item.path);

  const itemBaseClass = `flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold duration-150 transition-colors cursor-pointer ${
    isLightSidebar
      ? 'text-slate-800 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-800'
      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
  } ${
    isActive
      ? isLightSidebar
        ? 'bg-primary/10 text-primary font-bold shadow-xs'
        : 'bg-slate-800 text-white font-bold shadow-xs'
      : ''
  }`;

  if (item.children) {
    return (
      <li
        className="relative group"
        onMouseEnter={() => {
          cancelSubClose();
          setShowSubFlyout(true);
        }}
        onMouseLeave={scheduleSubClose}
      >
        <div
          className={itemBaseClass}
          onClick={(e) => {
            if (item.path) {
              e.preventDefault();
              navigate(destination);
              handleLinkClick();
            }
          }}
        >
          <span>{getSidebarLabel(item.label, isRTL)}</span>
          <AiOutlineRight size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {showSubFlyout && (
          <div
            className="absolute left-full top-0 ml-1.5 min-w-[210px] rounded-2xl border p-2 shadow-2xl z-[99999]"
            style={{
              backgroundColor: sidebarBg || (isLightSidebar ? '#FFFFFF' : '#0F172A'),
              borderColor: sidebarBorderColor || (isLightSidebar ? '#E2E8F0' : '#1E293B'),
              color: isLightSidebar ? '#0F172A' : '#F8FAFC',
              animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards',
            }}
            onMouseEnter={cancelSubClose}
            onMouseLeave={scheduleSubClose}
          >
            <div className="absolute top-0 -left-6 w-8 h-full bg-transparent pointer-events-auto" />
            <ul className="flex flex-col gap-1">
              {item.children.filter((child: any) => child && !child.hideFromSidebar).map((child: any, idx: number) => (
                <FlyoutSubMenu
                  key={idx}
                  item={child}
                  pathname={pathname}
                  handleLinkClick={handleLinkClick}
                  getTenantPath={getTenantPath}
                  sidebarColor={sidebarColor}
                  isLightSidebar={isLightSidebar}
                  sidebarBg={sidebarBg}
                  sidebarBorderColor={sidebarBorderColor}
                />
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={destination}
        onClick={handleLinkClick}
        className={itemBaseClass}
      >
        <span>{getSidebarLabel(item.label, isRTL)}</span>
      </NavLink>
    </li>
  );
};

// Reusable Multi-Level Recursive Sidebar Item Component
const SidebarItem = ({
  item,
  depth = 0,
  pathname,
  sidebarOpen,
  setSidebarOpen,
  isMobile,
  hideModal,
  openMenuId,
  setOpenMenuId,
  parentKey = 'root',
  getTenantPath,
  sidebarColor,
  layoutMode,
  behaviorMode,
  isLightSidebar,
  accentColor,
  sidebarBg,
  sidebarBorderColor,
}: any) => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const itemRef = useRef<any>(null);
  const closeTimerRef = useRef<any>(null);
  const menuUniqueKey = `${parentKey}-${item.label}`;
  const [open, setOpen] = useState(false);
  const [showFlyout, setShowFlyout] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);
  const [flyoutLeft, setFlyoutLeft] = useState<number>(56);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setShowFlyout(false);
    }, 250); // 250ms graceful close delay on hover out
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  // Helper check: Recursively verifies if any nested children match the active route URL
  const checkChildActive = (node: any): boolean => {
    if (node.path) {
      const destination = getTenantPath ? getTenantPath(node.path) : node.path;
      if (pathname === destination || pathname === node.path) return true;
    }
    if (node.children && Array.isArray(node.children)) {
      return node.children.some((child: any) => checkChildActive(child));
    }
    return false;
  };

  const isChildActive = checkChildActive(item);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active route ONLY when pathname changes
  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
      if (depth === 0) setOpenMenuId(menuUniqueKey);
    }
  }, [pathname, isChildActive, depth, menuUniqueKey, setOpenMenuId]);

  // Closes other parent groups if a completely different parent node section is selected
  useEffect(() => {
    if (depth === 0 && openMenuId !== menuUniqueKey && !isChildActive) {
      setOpen(false);
    }
  }, [openMenuId, menuUniqueKey, depth, isChildActive]);

  const shouldShowLabels = sidebarOpen || isMobile;

  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    hideModal();
    cancelClose();
    setShowFlyout(false);
  };

  const handleMouseEnter = () => {
    if (!sidebarOpen && !isMobile && itemRef.current) {
      cancelClose();
      const rect = itemRef.current.getBoundingClientRect();
      const asideEl = itemRef.current.closest('aside');
      const edgeRight = asideEl ? asideEl.getBoundingClientRect().right : rect.right;
      const estimatedHeight = Math.min((item.children?.length || 4) * 36 + 50, 420);
      const maxTop = Math.max(12, window.innerHeight - estimatedHeight - 16);
      setFlyoutTop(Math.max(12, Math.min(rect.top, maxTop)));
      setFlyoutLeft(Math.round(edgeRight) - 2);
      setShowFlyout(true);
    }
  };

  if (item.children) {
    return (
      <div
        ref={itemRef}
        className="w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleClose}
      >
        <SidebarLinkGroup activeCondition={isChildActive}>
          {(handleClick, isGroupOpen) => (
            <>
              <NavLink
                to={item.path ? ((getTenantPath ? getTenantPath(item.path) : item.path) || '#') : '#'}
                onMouseEnter={handleMouseEnter}
                className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out ${
                  isLightSidebar ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-white'
                } ${
                  isChildActive && shouldShowLabels ? 'font-bold shadow-xs' : ''
                } ${shouldShowLabels ? 'px-3.5 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
                style={{
                  paddingLeft: shouldShowLabels ? (depth === 0 ? '0.85rem' : depth === 1 ? '0.75rem' : '0.65rem') : undefined,
                  color: isChildActive && shouldShowLabels ? (isLightSidebar ? accentColor : '#FFFFFF') : sidebarColor,
                  backgroundColor: isChildActive && shouldShowLabels ? (isLightSidebar ? `${accentColor}18` : `${accentColor}25`) : undefined,
                  boxShadow: isChildActive && shouldShowLabels ? `inset 0 0 0 1px ${accentColor}35` : undefined,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.path) {
                    const dest = (getTenantPath ? getTenantPath(item.path) : item.path) || '#';
                    navigate(dest);
                    if (isMobile && hideModal) hideModal();
                    setOpen(true);
                  } else {
                    const nextState = !open;
                    setOpen(nextState);
                    if (nextState && depth === 0) {
                      setOpenMenuId(menuUniqueKey);
                    } else if (!nextState && depth === 0 && openMenuId === menuUniqueKey) {
                      setOpenMenuId(null);
                    }
                  }
                  handleClick();
                }}
              >
                {item.icon && (
                  <item.icon
                    className="text-lg shrink-0 transition-colors"
                    style={{ color: sidebarColor }}
                  />
                )}
                {shouldShowLabels && (
                  <>
                    <span
                      className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis flex flex-col gap-1 tracking-wide flex-1"
                      style={{ color: sidebarColor }}
                    >
                      {getSidebarLabel(item.label, isRTL)}
                    </span>
                    <span
                      className="ml-auto p-1 transition-transform duration-200 hover:scale-110 cursor-pointer"
                      style={{ color: sidebarColor, opacity: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const nextState = !open;
                        setOpen(nextState);
                        if (nextState && depth === 0) {
                          setOpenMenuId(menuUniqueKey);
                        } else if (!nextState && depth === 0 && openMenuId === menuUniqueKey) {
                          setOpenMenuId(null);
                        }
                        handleClick();
                      }}
                    >
                      {open ? <AiOutlineUp size={11} /> : <AiOutlineDown size={11} />}
                    </span>
                  </>
                )}
              </NavLink>

              {/* Collapsible Sub-item Drawer */}
              {shouldShowLabels && (
                <div
                  className="transition-all duration-300 ease-in-out overflow-hidden transform pl-2 ml-1.5 border-l"
                  style={{
                    maxHeight: open ? '1000px' : '0px',
                    opacity: open ? '100' : '0',
                    marginTop: open ? '4px' : '0px',
                    marginBottom: open ? '4px' : '0px',
                    pointerEvents: open ? 'auto' : 'none',
                    borderLeftColor: `${sidebarColor}30`,
                  }}
                >
                  <ul className="flex flex-col gap-1 py-1">
                    {Array.isArray(item.children) && item.children.filter((child: any) => child && !child.hideFromSidebar).map((child: any, idx: number) => (
                      <SidebarItem
                        key={idx}
                        item={child}
                        depth={depth + 1}
                        pathname={pathname}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        isMobile={isMobile}
                        hideModal={hideModal}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        parentKey={menuUniqueKey}
                        getTenantPath={getTenantPath}
                        sidebarColor={sidebarColor}
                        layoutMode={layoutMode}
                        behaviorMode={behaviorMode}
                        isLightSidebar={isLightSidebar}
                        accentColor={accentColor}
                        sidebarBg={sidebarBg}
                        sidebarBorderColor={sidebarBorderColor}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SidebarLinkGroup>

        {/* Collapsed Flyout Popover */}
        {!sidebarOpen && showFlyout && !isMobile && createPortal(
          <div
            className="fixed z-[99999] min-w-[210px] rounded-2xl border p-2 shadow-2xl"
            style={{
              top: `${flyoutTop}px`,
              left: `${flyoutLeft}px`,
              backgroundColor: sidebarBg || (isLightSidebar ? '#FFFFFF' : '#0F172A'),
              borderColor: sidebarBorderColor || (isLightSidebar ? '#E2E8F0' : '#1E293B'),
              color: isLightSidebar ? '#0F172A' : '#F8FAFC',
              animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards',
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <style>{`
              @keyframes sidebarFlyoutFadeIn {
                from { opacity: 0; transform: translateX(-4px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="absolute top-0 -left-10 w-12 h-full bg-transparent pointer-events-auto" />
            <div
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b mb-1 opacity-70"
              style={{
                borderColor: sidebarBorderColor || (isLightSidebar ? '#E2E8F0' : '#1E293B'),
                color: isLightSidebar ? '#475569' : '#94A3B8',
              }}
            >
              {getSidebarLabel(item.label, isRTL)}
            </div>
            <ul className="flex flex-col gap-1">
              {item.children.filter((child: any) => child && !child.hideFromSidebar).map((child: any, idx: number) => (
                <FlyoutSubMenu
                  key={idx}
                  item={child}
                  pathname={pathname}
                  handleLinkClick={handleLinkClick}
                  getTenantPath={getTenantPath}
                  sidebarColor={sidebarColor}
                  isLightSidebar={isLightSidebar}
                  sidebarBg={sidebarBg}
                  sidebarBorderColor={sidebarBorderColor}
                />
              ))}
            </ul>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const singleDestination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';
  const isDirectActive = item.path && (pathname === singleDestination || pathname === item.path);

  const handleSingleMouseEnter = () => {
    if (!sidebarOpen && !isMobile && itemRef.current) {
      cancelClose();
      const rect = itemRef.current.getBoundingClientRect();
      const asideEl = itemRef.current.closest('aside');
      const edgeRight = asideEl ? asideEl.getBoundingClientRect().right : rect.right;
      setFlyoutTop(Math.round(rect.top + (rect.height / 2) - 15));
      setFlyoutLeft(Math.round(edgeRight) + 4);
      setShowFlyout(true);
    }
  };

  return (
    <li
      ref={itemRef}
      onClick={handleLinkClick}
      className="w-full relative"
      title={!shouldShowLabels ? getSidebarLabel(item.label, isRTL) : undefined}
      onMouseEnter={handleSingleMouseEnter}
      onMouseLeave={scheduleClose}
    >
      <NavLink
        to={singleDestination}
        className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out ${
          isLightSidebar ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-white'
        } ${
          isDirectActive ? 'font-bold shadow-xs' : ''
        } ${shouldShowLabels ? 'px-3.5 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
        style={{
          paddingLeft: shouldShowLabels ? `${(depth + 1) * 0.85}rem` : undefined,
          color: isDirectActive && shouldShowLabels ? (isLightSidebar ? accentColor : '#FFFFFF') : sidebarColor,
          backgroundColor: isDirectActive ? (isLightSidebar ? `${accentColor}18` : `${accentColor}25`) : undefined,
          boxShadow: isDirectActive && shouldShowLabels ? `inset 0 0 0 1px ${accentColor}35` : undefined,
        }}
      >
        {item.icon && (
          <item.icon
            className="text-lg shrink-0 transition-colors"
            style={{ color: sidebarColor }}
          />
        )}
        {shouldShowLabels && (
          <span
            className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-wide"
            style={{ color: sidebarColor }}
          >
            {getSidebarLabel(item.label, isRTL)}
          </span>
        )}
      </NavLink>

      {!sidebarOpen && showFlyout && !isMobile && createPortal(
        <div
          className="fixed z-[99999] px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xl pointer-events-none whitespace-nowrap"
          style={{
            top: `${flyoutTop}px`,
            left: `${flyoutLeft}px`,
            backgroundColor: sidebarBg || (isLightSidebar ? '#FFFFFF' : '#0F172A'),
            borderColor: sidebarBorderColor || (isLightSidebar ? '#E2E8F0' : '#1E293B'),
            color: isLightSidebar ? '#0F172A' : '#F8FAFC',
            animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards',
          }}
        >
          {getSidebarLabel(item.label, isRTL)}
        </div>,
        document.body
      )}
    </li>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { getRoleBasedRoutes, logout, tenantId } = useAuth();
  const { isRTL } = useLanguage();
  const roleRoutes = getRoleBasedRoutes();
  const location = useLocation();
  const { hideModal } = useModal();
  const { pathname } = location;
  const sidebar = useRef<any>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const isTenantRoute = pathname.startsWith('/tenant=') || pathname.startsWith('/tenant-');
  const rawTenant = tenantId || (isTenantRoute ? pathname.split('/')[1] : '');
  const cleanSlug = rawTenant ? rawTenant.replace(/^tenant=/, '').replace(/^tenant-/, '').toLowerCase().trim() : '';
  const reservedPrefixes = ['auth', 'dev', 'assets', 'api', 'purchase', 'sales', 'reports', 'registration', 'administration', 'dashboard', 'sales-return'];
  const cleanPrefix = '';

  const getTenantPath = (path?: string) => {
    if (!path || typeof path !== 'string') return '';
    if (!cleanPrefix) return path;
    if (path === '/') return cleanPrefix;
    const cleanSub = path.startsWith('/') ? path : `/${path}`;
    return `${cleanPrefix}${cleanSub}`;
  };

  // Master tracking ID to determine which global branch header is clicked open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const brand = getBrandConfig();

  // Dedicated sidebar font/icon color state with contrast protection
  const [currentSidebarColor, setCurrentSidebarColor] = useState(getSavedSidebarColor());

  // Curated Suite & Background Theme State
  const [sidebarBg, setSidebarBg] = useState<string>(getSidebarBgTheme());
  const [accentColor, setAccentColor] = useState<string>(getSavedAccentColor());

  useEffect(() => {
    const handleBgChange = () => setSidebarBg(getSidebarBgTheme());
    const handleThemeChange = () => {
      setAccentColor(getSavedAccentColor());
      setSidebarBg(getSidebarBgTheme());
    };

    window.addEventListener('uzair_jibran_sidebar_bg_changed', handleBgChange);
    window.addEventListener('uzair_jibran_theme_suite_changed', handleThemeChange);
    window.addEventListener('uzair_jibran_theme_color_changed', handleThemeChange);

    return () => {
      window.removeEventListener('uzair_jibran_sidebar_bg_changed', handleBgChange);
      window.removeEventListener('uzair_jibran_theme_suite_changed', handleThemeChange);
      window.removeEventListener('uzair_jibran_theme_color_changed', handleThemeChange);
    };
  }, []);

  const isLightSidebar = sidebarBg.toUpperCase() === '#FFFFFF' || getContrastTextColor(sidebarBg) === '#0F172A';
  const sidebarBorderColor = isLightSidebar ? '#E2E8F0' : '#1E293B';

  // Sidebar Layout Mode (Floating Modern vs Classic Edge)
  const [layoutMode, setLayoutMode] = useState<SidebarLayoutMode>(getSidebarLayoutMode());
  const [behaviorMode, setBehaviorMode] = useState<SidebarBehaviorMode>(getSidebarBehaviorMode());

  useEffect(() => {
    const handleBehaviorChange = () => {
      setBehaviorMode(getSidebarBehaviorMode());
    };
    window.addEventListener('uzair_jibran_sidebar_behavior_changed', handleBehaviorChange);
    return () => window.removeEventListener('uzair_jibran_sidebar_behavior_changed', handleBehaviorChange);
  }, []);

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(getSidebarLayoutMode());
    };
    window.addEventListener('uzair_jibran_sidebar_layout_changed', updateLayoutMode);
    window.addEventListener('storage', updateLayoutMode);
    return () => {
      window.removeEventListener('uzair_jibran_sidebar_layout_changed', updateLayoutMode);
      window.removeEventListener('storage', updateLayoutMode);
    };
  }, []);

  const [wasContrastAdjusted, setWasContrastAdjusted] = useState(false);

  useEffect(() => {
    const updateColors = () => {
      const raw = localStorage.getItem('uzair_jibran_sidebar_raw_color') || getSavedSidebarColor();
      const res = getSafeSidebarColor(raw);
      setCurrentSidebarColor(res.safeColor);
      setWasContrastAdjusted(res.wasAdjusted);
    };

    updateColors();

    window.addEventListener('uzair_jibran_sidebar_color_changed', updateColors);
    window.addEventListener('color-mode-changed', updateColors);
    window.addEventListener('storage', updateColors);

    return () => {
      window.removeEventListener('uzair_jibran_sidebar_color_changed', updateColors);
      window.removeEventListener('color-mode-changed', updateColors);
      window.removeEventListener('storage', updateColors);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAsideMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (behaviorMode === 'auto_collapse' && !sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  const handleAsideMouseLeave = () => {
    if (isMobile) return;
    if (behaviorMode === 'auto_collapse' && sidebarOpen) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setSidebarOpen(false);
      }, 250);
    }
  };

  const handleAsideClick = () => {
    if (isMobile) return;
    if (behaviorMode === 'auto_collapse' && !sidebarOpen) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setSidebarOpen(true);
    }
  };

  const isMobile = windowWidth <= 750;

  return (
    <aside
      ref={sidebar}
      onMouseEnter={handleAsideMouseEnter}
      onMouseLeave={handleAsideMouseLeave}
      onClick={handleAsideClick}
      style={{
        backgroundColor: sidebarBg,
        borderColor: sidebarBorderColor,
        color: isLightSidebar ? '#0F172A' : '#F8FAFC',
      }}
      className={`flex flex-col duration-300 ease-in-out shadow-2xl select-none ${
        isLightSidebar ? 'text-slate-900' : 'text-slate-100'
      } ${
        isMobile
          ? 'fixed left-0 top-0 z-99999 h-screen block'
          : `min-[751px]:relative min-[751px]:shrink-0 min-[751px]:z-30 ${
              layoutMode === 'floating'
                ? 'min-[751px]:self-start min-[751px]:my-3 min-[751px]:ml-3 min-[751px]:h-fit min-[751px]:max-h-[calc(100vh-1.5rem)] min-[751px]:rounded-3xl min-[751px]:border min-[751px]:shadow-2xl'
                : 'min-[751px]:h-screen min-[751px]:rounded-none min-[751px]:border-r'
            }`
      } ${
        sidebarOpen
          ? `w-78 translate-x-0 visible ${layoutMode === 'classic' ? 'border-r' : ''}`
          : `w-0 -translate-x-full min-[751px]:w-18 ${layoutMode === 'floating' ? 'min-[751px]:translate-x-0' : 'min-[751px]:translate-x-0 min-[751px]:border-r'} max-[750px]:invisible`
      }`}
    >
      {/* Brand Header */}
      <div
        style={{ borderColor: isLightSidebar ? '#E2E8F0' : 'rgba(30, 41, 59, 0.8)' }}
        className={`flex items-center shrink-0 border-b ${
          sidebarOpen ? 'px-5 py-4' : 'justify-center p-3'
        }`}>
        {sidebarOpen ? (
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-90 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 p-1 flex items-center justify-center shadow-md shrink-0 border border-slate-800 dark:border-slate-200 overflow-hidden select-none">
              <img src={IconDark} alt="Logo" className="w-full h-full object-contain block dark:hidden" />
              <img src={IconLight} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
            </div>

            <div className="flex flex-col min-w-0">
              <span
                style={{ color: isLightSidebar ? '#0F172A' : '#FFFFFF' }}
                className={`font-black tracking-tight text-sm leading-tight truncate ${isRTL ? 'font-sans' : 'font-cinzel'}`}
              >
                {isRTL ? 'عزیر جبران کلوتھ' : (brand.fullName || 'UZAIR JIBRAN CLOTH')}
              </span>
              <span
                style={{ color: isLightSidebar ? '#64748B' : '#94A3B8' }}
                className="text-[10px] font-mono tracking-wider uppercase font-bold"
              >
                {isRTL ? 'کلوتھ کھاتہ' : 'CLOTH ACCOUNTS'}
              </span>
            </div>
          </NavLink>
        ) : (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 p-1 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all duration-200 border border-slate-800 dark:border-slate-200 overflow-hidden select-none cursor-pointer group"
            title="Click to Open / Expand Sidebar"
          >
            <img src={IconDark} alt="Logo" className="w-full h-full object-contain block dark:hidden group-hover:scale-110 transition-transform" />
            <img src={IconLight} alt="Logo" className="w-full h-full object-contain hidden dark:block group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {/* Floating Border Edge Toggle Tab (Half-circle protruding on border center) */}
      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        style={{
          backgroundColor: sidebarBg,
          borderColor: isLightSidebar ? '#CBD5E1' : '#334155',
          color: isLightSidebar ? '#475569' : '#94A3B8',
        }}
        className={`absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-10 shadow-md cursor-pointer transition-all duration-200 hover:w-6 hover:text-primary dark:hover:text-primary group ${
          isRTL
            ? '-left-3.5 rounded-l-full border-y border-l border-slate-700/80 dark:border-slate-300'
            : '-right-3.5 rounded-r-full border-y border-r border-slate-700/80 dark:border-slate-300'
        }`}
        title={sidebarOpen ? (isRTL ? 'سائیڈبار بند کریں' : 'Collapse Sidebar (<)') : (isRTL ? 'سائیڈبار کھولیں' : 'Expand Sidebar (>)')}
      >
        {sidebarOpen ? (
          isRTL ? (
            <FiChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          ) : (
            <FiChevronLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          )
        ) : (
          isRTL ? (
            <FiChevronLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          ) : (
            <FiChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          )
        )}
      </button>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-3">
        <ul className="flex flex-col gap-1.5">
          {roleRoutes.filter((item: any) => item && !item.hideFromSidebar).map((item: any, idx: number) => (
            <SidebarItem
              key={idx}
              item={item}
              pathname={pathname}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              isMobile={isMobile}
              hideModal={hideModal}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              getTenantPath={getTenantPath}
              sidebarColor={currentSidebarColor}
              layoutMode={layoutMode}
              behaviorMode={behaviorMode}
              isLightSidebar={isLightSidebar}
              accentColor={accentColor}
              sidebarBg={sidebarBg}
              sidebarBorderColor={sidebarBorderColor}
            />
          ))}

          {/* Settings Button */}
          <li className="w-full mt-2">
            <NavLink
              to={getTenantPath('/settings')}
              className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out ${
                isLightSidebar ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-white'
              } ${
                pathname === getTenantPath('/settings') || pathname === '/settings' ? 'font-bold shadow-xs' : ''
              } ${sidebarOpen ? 'px-3.5 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
              style={{
                color: currentSidebarColor,
                backgroundColor: pathname === getTenantPath('/settings') || pathname === '/settings' ? `${currentSidebarColor}20` : undefined,
              }}
              title={!sidebarOpen ? (isRTL ? 'سیٹنگز' : 'Settings') : undefined}
            >
              <LuSlidersHorizontal className="text-lg shrink-0 transition-colors" />
              {sidebarOpen && (
                <span className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                  {isRTL ? 'سیٹنگز' : 'Settings'}
                </span>
              )}
            </NavLink>
          </li>

          {/* Log Out Button */}
          <li
            className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-rose-500/15 dark:hover:bg-rose-50 hover:text-rose-400 dark:hover:text-rose-600 cursor-pointer mt-4 border-t border-slate-800/90 dark:border-slate-200/90 pt-4 ${
              sidebarOpen ? 'justify-start px-3.5' : 'justify-center mx-auto w-10 h-10 px-0'
            }`}
            style={{ color: currentSidebarColor }}
            onClick={() => logout()}
            title={!sidebarOpen ? (isRTL ? 'لاگ آؤٹ' : 'Log Out') : undefined}
          >
            <LuLogOut className="text-lg shrink-0 transition-colors" />
            {sidebarOpen && (
              <span className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                {isRTL ? 'لاگ آؤٹ' : 'Log Out'}
              </span>
            )}
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
