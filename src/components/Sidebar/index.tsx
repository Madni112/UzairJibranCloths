import React, { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { AiOutlineUp, AiOutlineDown, AiOutlineRight, AiOutlineArrowLeft } from 'react-icons/ai';
import { LuLogOut, LuPalette } from 'react-icons/lu';
import { useModal } from '../../Context/Modal';
import { useAuth } from '../../Context/Auth';
import { PRESET_THEME_COLORS, applySidebarColor, getSavedSidebarColor, getSafeSidebarColor } from '../../constant/themeConfig';
import LogoDark from '../../images/logo/logo-dark.png';
import LogoLight from '../../images/logo/logo-light.png';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';
import { Weight } from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const FlyoutSubMenu = ({ item, pathname, handleLinkClick, getTenantPath, sidebarColor }: any) => {
  const [showSubFlyout, setShowSubFlyout] = useState(false);

  if (item && item.children && Array.isArray(item.children)) {
    return (
      <li
        className="relative"
        onMouseEnter={() => setShowSubFlyout(true)}
        onMouseLeave={() => setShowSubFlyout(false)}
      >
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer pr-4"
          style={{ color: sidebarColor }}
        >
          <span className="truncate">{item.label}</span>
          <AiOutlineRight size={10} className="shrink-0" style={{ color: sidebarColor }} />
        </div>

        {showSubFlyout && (
          <div
            className="absolute left-full top-0 -ml-1.5 z-99999 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1E293B]/95 p-2 shadow-2xl backdrop-blur-md"
            style={{ animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards' }}
          >
            <div className="absolute top-0 -left-3 w-3 h-full bg-transparent" />
            <ul className="flex flex-col gap-1">
              {item.children.map((child: any, idx: number) => (
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

  const destination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';
  const isActive = pathname === destination || pathname === item.path;

  return (
    <li>
      <NavLink
        to={destination}
        onClick={handleLinkClick}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 ${
          isActive ? 'shadow-xs font-bold' : ''
        }`}
        style={{
          color: sidebarColor,
          backgroundColor: isActive ? `${sidebarColor}20` : undefined,
        }}
      >
        {item.label}
      </NavLink>
    </li>
  );
};

const SidebarItem = ({
  item,
  pathname,
  depth = 0,
  sidebarOpen,
  setSidebarOpen,
  hideModal,
  openMenuId,
  setOpenMenuId,
  menuUniqueKey,
  getTenantPath,
  sidebarColor,
}: any) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showFlyout, setShowFlyout] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);

  // Helper check: Recursively verifies if any nested children match the active route URL
  const checkHasActiveChild = (routeItem: any): boolean => {
    if (!routeItem) return false;
    if (!routeItem.children || !Array.isArray(routeItem.children)) return false;

    return routeItem.children.some((child: any) => {
      const dest = child.path && getTenantPath ? getTenantPath(child.path) : child.path;
      const cleanChildPath = String(child.path || '').toLowerCase();
      const cleanDest = String(dest || '').toLowerCase();
      const cleanPathname = String(pathname || '').toLowerCase();

      if (cleanChildPath && (cleanPathname === cleanChildPath || cleanPathname === cleanDest)) return true;

      // Match sub-routes (e.g., /Add, /Edit, /Print, /customer-details) of this child
      const baseChild = cleanChildPath.replace(/\/(list|customer-details|add)$/i, '');
      if (baseChild && baseChild.length > 2 && cleanPathname.includes(baseChild)) {
        return true;
      }

      if (child.children) return checkHasActiveChild(child);
      return false;
    });
  };

  const itemDestination = item?.path && getTenantPath ? getTenantPath(item.path) : (item?.path || '');
  const isChildActive = checkHasActiveChild(item) || Boolean(item?.path && (pathname === item.path || pathname === itemDestination));

  // Local toggle state initializes accurately based on the active path to support hard refreshes
  const [open, setOpen] = useState(isChildActive);

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

  const isMobile = windowWidth <= 750;
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
      setFlyoutTop(rect.top);
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
                className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
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
                    {Array.isArray(item.children) && item.children.map((child: any, idx: number) => (
                      <SidebarItem
                        key={idx}
                        item={child}
                        pathname={pathname}
                        depth={depth + 1}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        hideModal={hideModal}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        menuUniqueKey={`${menuUniqueKey}-${idx}`}
                        getTenantPath={getTenantPath}
                        sidebarColor={sidebarColor}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SidebarLinkGroup>

        {!sidebarOpen && showFlyout && !isMobile && (
          <div
            className="fixed left-[56px] z-99999 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1E293B]/95 p-2.5 shadow-2xl backdrop-blur-md"
            style={{
              top: `${flyoutTop}px`,
              animation: 'sidebarFlyoutFadeIn 0.18s ease-out forwards'
            }}
          >
            <style>{`
              @keyframes sidebarFlyoutFadeIn {
                from { opacity: 0; transform: translateX(-6px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div
              className="px-3 py-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider text-left"
              style={{ color: sidebarColor }}
            >
              {item.label}
            </div>
            <ul className="flex flex-col gap-1">
              {item.children.map((child: any, idx: number) => (
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

  return (
    <li onClick={handleLinkClick} className="w-full" title={!shouldShowLabels ? item.label : undefined}>
      <NavLink
        to={singleDestination}
        className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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

  // Dedicated sidebar font/icon color state with contrast protection
  const [currentSidebarColor, setCurrentSidebarColor] = useState(getSavedSidebarColor());
  const [customHexInput, setCustomHexInput] = useState(getSavedSidebarColor().replace('#', ''));
  const [wasContrastAdjusted, setWasContrastAdjusted] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [collapsedColorPickerOpen, setCollapsedColorPickerOpen] = useState(false);
  const collapsedPickerRef = useRef<HTMLDivElement>(null);

  const handleSidebarColorChange = (hex: string) => {
    const { safeColor, wasAdjusted } = applySidebarColor(hex);
    setCurrentSidebarColor(safeColor);
    setCustomHexInput(safeColor.replace('#', ''));
    setWasContrastAdjusted(wasAdjusted);
    if (wasAdjusted) {
      setTimeout(() => setWasContrastAdjusted(false), 4500);
    }
  };

  const handleCustomHexSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = customHexInput.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length === 6 && /^[0-9A-Fa-f]{6}$/.test(clean)) {
      handleSidebarColorChange(`#${clean}`);
    }
  };

  useEffect(() => {
    const initial = getSavedSidebarColor();
    const { safeColor, wasAdjusted } = applySidebarColor(initial);
    setCurrentSidebarColor(safeColor);
    setCustomHexInput(safeColor.replace('#', ''));
    setWasContrastAdjusted(wasAdjusted);

    const handleColorUpdate = () => {
      const updated = getSavedSidebarColor();
      setCurrentSidebarColor(updated);
      setCustomHexInput(updated.replace('#', ''));
    };
    window.addEventListener('zoaib_ali_sidebar_color_changed', handleColorUpdate);
    window.addEventListener('storage', handleColorUpdate);

    // Watch for dark / light mode toggle to ensure contrast is always maintained
    const observer = new MutationObserver(() => {
      const current = getSavedSidebarColor();
      const res = applySidebarColor(current);
      setCurrentSidebarColor(res.safeColor);
      setCustomHexInput(res.safeColor.replace('#', ''));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('zoaib_ali_sidebar_color_changed', handleColorUpdate);
      window.removeEventListener('storage', handleColorUpdate);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collapsedPickerRef.current && !collapsedPickerRef.current.contains(e.target as Node)) {
        setCollapsedColorPickerOpen(false);
      }
    };
    if (collapsedColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [collapsedColorPickerOpen]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 750;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-9999 backdrop-blur-xs transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
      )}

      <aside ref={sidebar} className={`fixed left-0 top-0 z-99999 flex h-screen flex-col bg-white duration-300 ease-in-out dark:bg-[#111827] shadow-xl ${isMobile ? 'block' : 'min-[751px]:sticky min-[751px]:top-0'} ${sidebarOpen ? 'w-72.5 translate-x-0 border-r border-slate-200/80 dark:border-slate-800/80 visible' : 'w-0 -translate-x-full min-[751px]:w-18 min-[751px]:translate-x-0 min-[751px]:border-r min-[751px]:border-slate-200/80 min-[751px]:dark:border-slate-800/80 max-[750px]:invisible'}`} >

        {/* Brand Header */}
        <div className={`flex items-center justify-between gap-2 py-5 border-b border-slate-200/80 dark:border-slate-800/80 min-h-[76px] duration-300 ${sidebarOpen ? 'px-6' : 'px-0 min-[751px]:px-2 justify-center'}`} >
          {(sidebarOpen || isMobile) ? (
            <div className="flex items-center justify-between w-full">
              <NavLink className="flex items-center gap-3.5 group" to="/">
                <div className="w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-all duration-200 border border-primary/40 relative overflow-hidden select-none shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                  <span className="relative z-10 font-cinzel font-black tracking-widest text-[16px] text-white dark:text-[#111827] leading-none pl-0.5">
                    ZAC
                  </span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="text-[20px] font-black text-primary tracking-tight">ZOAIB</span>
                    <span className="text-[20px] font-black text-slate-800 dark:text-slate-100 tracking-tight">ALI</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[12.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">& COMPANY</span>
                  </div>
                </div>
              </NavLink>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarOpen(false);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <AiOutlineArrowLeft size={18} />
              </button>
            </div>
          ) : (
            <div
              className="w-full flex justify-center cursor-pointer py-1"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(true);
              }}
              title="Open Sidebar"
            >
              <div className="w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-all duration-200 border border-primary/40 relative overflow-hidden select-none">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                <span className="relative z-10 font-cinzel font-black tracking-widest text-[16px] text-white dark:text-[#111827] leading-none pl-0.5">
                  ZAC
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <div className="no-scrollbar flex flex-col overflow-y-auto overflow-x-hidden flex-1">
          <nav className={`py-4 duration-300 ${sidebarOpen ? 'px-3' : 'px-0 min-[751px]:px-2'}`}>
            <ul className="mb-6 flex flex-col gap-1.5 w-full">
              {(Array.isArray(roleRoutes) ? roleRoutes : [])
                .filter((route: any) => route && !route.hideFromSidebar)
                .map((route: any, index: number) => (
                  <SidebarItem
                    key={index}
                    item={route}
                    pathname={pathname}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    hideModal={hideModal}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    menuUniqueKey={`root-${index}`}
                    getTenantPath={getTenantPath}
                    sidebarColor={currentSidebarColor}
                  />
                ))
              }

              {/* SIDEBAR FONT & ICON COLOR DROPDOWN (EXPANDED) */}
              {(sidebarOpen || isMobile) && (
                <li className="w-full">
                  <div
                    onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
                    className="group relative flex items-center justify-between rounded-xl py-2.5 px-3.5 font-medium duration-200 ease-in-out hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer select-none"
                    style={{ color: currentSidebarColor }}
                  >
                    <div className="flex items-center">
                      <LuPalette
                        className="text-lg shrink-0 transition-colors"
                        style={{ color: currentSidebarColor }}
                      />
                      <span
                        className="text-xs font-semibold ml-2.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-wide"
                        style={{ color: currentSidebarColor }}
                      >
                        Color
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {wasContrastAdjusted && (
                        <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                          Contrast Safe
                        </span>
                      )}
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs transition-colors shrink-0"
                        style={{ backgroundColor: currentSidebarColor }}
                        title={`Active: ${currentSidebarColor}`}
                      />
                      <span
                        className="transition-transform duration-200"
                        style={{ color: currentSidebarColor, opacity: 0.8 }}
                      >
                        {colorDropdownOpen ? <AiOutlineUp size={11} /> : <AiOutlineDown size={11} />}
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Color Palette Drawer */}
                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden transform pl-3 ml-2 border-l"
                    style={{
                      maxHeight: colorDropdownOpen ? '420px' : '0px',
                      opacity: colorDropdownOpen ? '100' : '0',
                      marginTop: colorDropdownOpen ? '4px' : '0px',
                      marginBottom: colorDropdownOpen ? '4px' : '0px',
                      pointerEvents: colorDropdownOpen ? 'auto' : 'none',
                      borderLeftColor: `${currentSidebarColor}30`,
                    }}
                  >
                    <div className="p-3 my-1 rounded-2xl bg-slate-50/95 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 shadow-xs">
                      {/* Presets Header */}
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Preset Colors
                        </span>
                        {wasContrastAdjusted && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md animate-pulse">
                            Auto-adjusted for contrast
                          </span>
                        )}
                      </div>

                      {/* Presets Grid */}
                      <div className="grid grid-cols-6 gap-1.5 mb-3">
                        {PRESET_THEME_COLORS.map((c) => {
                          const isSelected = currentSidebarColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              title={c.name}
                              onClick={() => handleSidebarColorChange(c.hex)}
                              className={`w-5.5 h-5.5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'scale-115 ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900 border-white shadow-xs'
                                  : 'border-black/10 hover:scale-120 opacity-85 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dedicated Custom Color Section */}
                      <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Custom Option
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            Color Wheel & Hex
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl p-1.5 shadow-2xs">
                          {/* Color Wheel Clickable Swatch */}
                          <label
                            className="relative flex items-center justify-center cursor-pointer shrink-0"
                            title="Click to open color picker wheel"
                          >
                            <span
                              className="w-7 h-7 rounded-lg border border-black/15 shadow-xs transition-transform hover:scale-105 block"
                              style={{ backgroundColor: currentSidebarColor }}
                            />
                            <input
                              type="color"
                              value={currentSidebarColor}
                              onChange={(e) => handleSidebarColorChange(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>

                          {/* Hex Text Input */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleCustomHexSubmit();
                            }}
                            className="flex items-center flex-1 min-w-0"
                          >
                            <div className="flex items-center flex-1 px-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                              <span className="text-slate-400 select-none mr-0.5">#</span>
                              <input
                                type="text"
                                maxLength={6}
                                value={customHexInput}
                                onChange={(e) => setCustomHexInput(e.target.value)}
                                placeholder="RRGGBB"
                                className="w-full bg-transparent outline-none uppercase font-mono tracking-wider text-xs"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-white shadow-xs transition hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
                              style={{ backgroundColor: currentSidebarColor }}
                            >
                              Apply
                            </button>
                          </form>
                        </div>

                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 px-0.5 leading-tight">
                          Protected against invisible fonts (e.g. white on light, dark on dark).
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* SIDEBAR FONT & ICON COLOR DROPDOWN (COLLAPSED POPUP) */}
              {!sidebarOpen && !isMobile && (
                <li className="relative flex justify-center mx-auto w-10 h-10 px-0 my-1">
                  <button
                    type="button"
                    onClick={() => setCollapsedColorPickerOpen(!collapsedColorPickerOpen)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Color"
                  >
                    <LuPalette size={18} style={{ color: currentSidebarColor }} />
                  </button>
                  {collapsedColorPickerOpen && (
                    <div
                      ref={collapsedPickerRef}
                      className="fixed left-[56px] z-99999 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1E293B]/95 p-3 shadow-2xl backdrop-blur-md"
                      style={{ bottom: '70px', animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: currentSidebarColor }}>
                          <LuPalette size={12} style={{ color: currentSidebarColor }} />
                          Color
                        </span>
                        {wasContrastAdjusted && (
                          <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            Protected
                          </span>
                        )}
                      </div>

                      {/* Presets Grid */}
                      <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                        {PRESET_THEME_COLORS.map((c) => {
                          const isSelected = currentSidebarColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              title={c.name}
                              onClick={() => {
                                handleSidebarColorChange(c.hex);
                              }}
                              className={`w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'scale-115 ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900 border-white shadow-xs'
                                  : 'border-black/10 hover:scale-120 opacity-85 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Option in Popover */}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                          <label className="relative flex items-center justify-center cursor-pointer shrink-0" title="Color Picker">
                            <span
                              className="w-5 h-5 rounded border border-black/15 shadow-xs block"
                              style={{ backgroundColor: currentSidebarColor }}
                            />
                            <input
                              type="color"
                              value={currentSidebarColor}
                              onChange={(e) => handleSidebarColorChange(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={customHexInput}
                            onChange={(e) => setCustomHexInput(e.target.value)}
                            placeholder="HEX"
                            className="w-full bg-transparent outline-none uppercase font-mono text-[10px] font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleCustomHexSubmit()}
                            className="px-2 py-0.5 text-[10px] font-bold rounded text-white shadow-xs cursor-pointer"
                            style={{ backgroundColor: currentSidebarColor }}
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )}

              {/* Log Out Button */}
              <li 
                className={`group relative flex items-center rounded-xl py-2.5 font-medium duration-200 ease-in-out hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer mt-4 border-t border-slate-200/80 dark:border-slate-800 pt-4 ${sidebarOpen ? 'justify-start px-3.5' : 'justify-center mx-auto w-10 h-10 px-0'}`} 
                style={{ color: currentSidebarColor }}
                onClick={() => logout()} 
                title={!sidebarOpen ? 'LogOut' : undefined} 
              >
                <LuLogOut
                  className="text-lg shrink-0 transition-colors group-hover:text-rose-600 dark:group-hover:text-rose-400"
                  style={{ color: currentSidebarColor }}
                />
                {(sidebarOpen || isMobile) && (
                  <span className="ml-3 text-xs font-semibold" style={{ color: currentSidebarColor }}>
                    Log Out
                  </span>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
