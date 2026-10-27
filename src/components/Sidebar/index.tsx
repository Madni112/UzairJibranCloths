import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { AiOutlineUp, AiOutlineDown, AiOutlineRight, AiOutlineArrowLeft } from 'react-icons/ai';
import { LuLogOut } from 'react-icons/lu';
import { useModal } from '../../Context/Modal';
import { useAuth } from '../../Context/Auth';
import {
  PRESET_THEME_COLORS,
  applySidebarColor,
  getSavedSidebarColor,
  getSafeSidebarColor,
  SidebarLayoutMode,
  getSidebarLayoutMode,
} from '../../constant/themeConfig';
import { getBrandConfig } from '../../utils/brand';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean | ((prev: boolean) => boolean)) => void;
}

// Collapsed hover nested flyout component
const FlyoutSubMenu = ({ item, pathname, handleLinkClick, getTenantPath, sidebarColor }: any) => {
  const [showSubFlyout, setShowSubFlyout] = useState(false);
  const destination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';
  const isActive = item.path && (pathname === destination || pathname === item.path);

  if (item.children) {
    return (
      <li
        className="relative"
        onMouseEnter={() => setShowSubFlyout(true)}
        onMouseLeave={() => setShowSubFlyout(false)}
      >
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold duration-150 hover:bg-slate-800/80 dark:hover:bg-slate-100 cursor-pointer"
          style={{ color: sidebarColor }}
        >
          <span>{item.label}</span>
          <AiOutlineRight size={10} style={{ color: sidebarColor, opacity: 0.7 }} />
        </div>

        {showSubFlyout && (
          <div
            className="absolute left-full top-0 ml-1 min-w-[200px] rounded-xl border border-slate-700/90 dark:border-slate-200/90 bg-slate-900/95 dark:bg-white/95 p-1.5 shadow-2xl backdrop-blur-md z-99999"
            style={{ animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards' }}
          >
            <div className="absolute top-0 -left-3 w-3 h-full bg-transparent" />
            <ul className="flex flex-col gap-1">
              {item.children.filter((child: any) => child && !child.hideFromSidebar).map((child: any, idx: number) => (
                <FlyoutSubMenu
                  key={idx}
                  item={child}
                  pathname={pathname}
                  handleLinkClick={handleLinkClick}
                  getTenantPath={getTenantPath}
                  sidebarColor={sidebarColor}
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
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold duration-150 hover:bg-slate-800/80 dark:hover:bg-slate-100 ${
          isActive ? 'shadow-xs font-bold' : ''
        }`}
        style={{
          color: sidebarColor,
          backgroundColor: isActive ? `${sidebarColor}20` : undefined,
        }}
      >
        <span>{item.label}</span>
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
}: any) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const menuUniqueKey = `${parentKey}-${item.label}`;
  const [open, setOpen] = useState(false);
  const [showFlyout, setShowFlyout] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);
  const [flyoutLeft, setFlyoutLeft] = useState<number>(56);

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
    setShowFlyout(false);
  };

  const handleMouseEnter = () => {
    if (!sidebarOpen && !isMobile && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      const estimatedHeight = Math.min((item.children?.length || 4) * 36 + 50, 420);
      const maxTop = Math.max(12, window.innerHeight - estimatedHeight - 16);
      setFlyoutTop(Math.min(rect.top, maxTop));
      setFlyoutLeft(rect.right + 8);
      setShowFlyout(true);
    }
  };

  if (item.children) {
    return (
      <div
        ref={itemRef}
        className="w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => !sidebarOpen && !isMobile && setShowFlyout(false)}
      >
        <SidebarLinkGroup activeCondition={isChildActive}>
          {(handleClick, isGroupOpen) => (
            <>
              <NavLink
                to="#"
                className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-slate-800/80 dark:hover:bg-slate-100 ${
                  isChildActive && shouldShowLabels ? 'font-bold shadow-xs' : ''
                } ${shouldShowLabels ? 'px-3.5 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
                style={{
                  paddingLeft: shouldShowLabels ? `${(depth + 1) * 0.85}rem` : undefined,
                  color: sidebarColor,
                  backgroundColor: isChildActive && shouldShowLabels ? `${sidebarColor}20` : undefined,
                }}
                onClick={(e) => {
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
                {item.icon && (
                  <item.icon
                    className="text-lg shrink-0 transition-colors"
                    style={{ color: sidebarColor }}
                  />
                )}
                {shouldShowLabels && (
                  <>
                    <span
                      className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis flex flex-col gap-1 tracking-wide"
                      style={{ color: sidebarColor }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="ml-auto transition-transform duration-200"
                      style={{ color: sidebarColor, opacity: 0.8 }}
                    >
                      {open ? <AiOutlineUp size={11} /> : <AiOutlineDown size={11} />}
                    </span>
                  </>
                )}
              </NavLink>

              {/* Collapsible Sub-item Drawer */}
              {shouldShowLabels && (
                <div
                  className="transition-all duration-300 ease-in-out overflow-hidden transform pl-3 ml-2 border-l"
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
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SidebarLinkGroup>

        {/* Collapsed Flyout Popover */}
        {!sidebarOpen && showFlyout && !isMobile && (
          <div
            className="fixed z-99999 min-w-[210px] rounded-2xl border border-slate-700/90 dark:border-slate-200/90 bg-slate-900/95 dark:bg-white/95 p-2 shadow-2xl backdrop-blur-md"
            style={{
              top: `${flyoutTop}px`,
              left: `${flyoutLeft}px`,
              animation: 'sidebarFlyoutFadeIn 0.18s ease-out forwards',
            }}
          >
            <style>{`
              @keyframes sidebarFlyoutFadeIn {
                from { opacity: 0; transform: translateX(-6px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="absolute top-0 -left-3 w-3 h-full bg-transparent" />
            <div
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b border-slate-800 dark:border-slate-200/60 mb-1"
              style={{ color: sidebarColor, opacity: 0.7 }}
            >
              {item.label}
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
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const singleDestination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';
  const isDirectActive = item.path && (pathname === singleDestination || pathname === item.path);

  const handleSingleMouseEnter = () => {
    if (!sidebarOpen && !isMobile && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setFlyoutTop(rect.top + (rect.height / 2) - 15);
      setFlyoutLeft(rect.right + 8);
      setShowFlyout(true);
    }
  };

  return (
    <li
      ref={itemRef}
      onClick={handleLinkClick}
      className="w-full relative"
      title={!shouldShowLabels ? item.label : undefined}
      onMouseEnter={handleSingleMouseEnter}
      onMouseLeave={() => !sidebarOpen && !isMobile && setShowFlyout(false)}
    >
      <NavLink
        to={singleDestination}
        className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-slate-800/80 dark:hover:bg-slate-100 ${
          isDirectActive ? 'font-bold shadow-xs' : ''
        } ${shouldShowLabels ? 'px-3.5 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
        style={{
          paddingLeft: shouldShowLabels ? `${(depth + 1) * 0.85}rem` : undefined,
          color: sidebarColor,
          backgroundColor: isDirectActive ? `${sidebarColor}20` : undefined,
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
            {item.label}
          </span>
        )}
      </NavLink>

      {!sidebarOpen && showFlyout && !isMobile && (
        <div
          className="fixed z-99999 px-3 py-1.5 rounded-xl border border-slate-700/90 dark:border-slate-200/90 bg-slate-900/95 dark:bg-white/95 text-xs font-bold shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap"
          style={{
            top: `${flyoutTop}px`,
            left: `${flyoutLeft}px`,
            color: sidebarColor,
            animation: 'sidebarFlyoutFadeIn 0.18s ease-out forwards',
          }}
        >
          {item.label}
        </div>
      )}
    </li>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { getRoleBasedRoutes, logout, tenantId } = useAuth();
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
  const cleanPrefix = cleanSlug && !reservedPrefixes.includes(cleanSlug) ? `/${cleanSlug}` : '';

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

  // Sidebar Layout Mode (Floating Modern vs Classic Edge)
  const [layoutMode, setLayoutMode] = useState<SidebarLayoutMode>(getSidebarLayoutMode());

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
      const res = applySidebarColor(raw);
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

  const isMobile = windowWidth <= 750;

  return (
    <aside
      ref={sidebar}
      className={`flex flex-col bg-[#0B0F17] dark:bg-white text-slate-100 dark:text-slate-900 duration-300 ease-in-out shadow-2xl select-none ${
        isMobile
          ? 'fixed left-0 top-0 z-99999 h-screen block'
          : `min-[751px]:relative min-[751px]:shrink-0 min-[751px]:z-30 ${
              layoutMode === 'floating'
                ? 'min-[751px]:self-start min-[751px]:my-3 min-[751px]:ml-3 min-[751px]:h-fit min-[751px]:max-h-[calc(100vh-1.5rem)] min-[751px]:rounded-3xl min-[751px]:border min-[751px]:border-slate-800/90 dark:min-[751px]:border-slate-200/90 min-[751px]:shadow-2xl'
                : 'min-[751px]:h-screen min-[751px]:rounded-none min-[751px]:border-r min-[751px]:border-slate-800/90 dark:min-[751px]:border-slate-200/90'
            }`
      } ${
        sidebarOpen
          ? `w-72.5 translate-x-0 visible ${layoutMode === 'classic' ? 'border-r border-slate-800/90 dark:border-slate-200/90' : ''}`
          : `w-0 -translate-x-full min-[751px]:w-18 ${layoutMode === 'floating' ? 'min-[751px]:translate-x-0' : 'min-[751px]:translate-x-0 min-[751px]:border-r min-[751px]:border-slate-800/90 dark:min-[751px]:border-slate-200/90'} max-[750px]:invisible`
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-800/80 dark:border-slate-200/80 shrink-0">
        <NavLink
          to={cleanPrefix || '/'}
          className={`flex items-center gap-3 transition-opacity duration-200 hover:opacity-90 ${
            !sidebarOpen ? 'mx-auto' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 shrink-0 border border-primary/30 relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
            <span className="relative z-10 font-cinzel font-black tracking-widest text-[13px] text-white leading-none pl-0.5">
              UJC
            </span>
          </div>

          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-cinzel font-black tracking-tight text-sm text-white dark:text-slate-900 leading-tight truncate">
                {brand.fullName || 'UZAIR JIBRAN CLOTH'}
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 dark:text-slate-500 font-bold">
                CLOTH ERP
              </span>
            </div>
          )}
        </NavLink>

        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-slate-800/80 dark:hover:bg-slate-100 rounded-lg text-slate-400 dark:text-slate-600 hover:text-white dark:hover:text-black transition-colors"
            title="Collapse Sidebar"
          >
            <AiOutlineArrowLeft size={16} />
          </button>
        )}
      </div>

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
            />
          ))}

          {/* Log Out Button */}
          <li
            className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-rose-500/15 dark:hover:bg-rose-50 hover:text-rose-400 dark:hover:text-rose-600 cursor-pointer mt-4 border-t border-slate-800/90 dark:border-slate-200/90 pt-4 ${
              sidebarOpen ? 'justify-start px-3.5' : 'justify-center mx-auto w-10 h-10 px-0'
            }`}
            style={{ color: currentSidebarColor }}
            onClick={() => logout()}
            title={!sidebarOpen ? 'LogOut' : undefined}
          >
            <LuLogOut className="text-lg shrink-0 transition-colors" />
            {sidebarOpen && (
              <span className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                Log Out
              </span>
            )}
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
