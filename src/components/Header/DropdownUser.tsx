import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClickOutside from '../ClickOutside';
import { LuLogOut, LuBuilding2, LuMail, LuPenLine } from 'react-icons/lu';
import { MdPerson } from 'react-icons/md';
import { useAuth, detectPortalTenant } from '../../Context/Auth';
import { supabase } from '../../Context/supabaseClient';
import {
  SHOW_THEME_COLOR_PICKER,
  PRESET_THEME_COLORS,
  applyAccentColor,
  getSavedAccentColor,
} from '../../constant/themeConfig';

const DropdownUser = () => {
  const { logout, businessName: authBusinessName, userEmail, role, currentUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<any>();
  const [imageError, setImageError] = useState(false);
  const [accentColor, setAccentColor] = useState<string>(getSavedAccentColor());

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        setProfile(JSON.parse(user));
      } catch (_) {}
    }
    const current = getSavedAccentColor();
    setAccentColor(current);
    applyAccentColor(current);
  }, []);

  const handleColorSelect = (hex: string) => {
    setAccentColor(hex);
    applyAccentColor(hex);
  };

  const Logout = () => {
    logout();
  };

  const displayEmail = userEmail || profile?.email || 'admin@zoaibalicompany.com';
  const displayRole = role || profile?.role || 'Super Admin';
  const displayCompanyName = 'Zoaib Ali & Company';
  const displayName = profile?.user_metadata?.full_name || profile?.user_metadata?.name || displayCompanyName;

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative z-9999">
      <Link
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-3.5 cursor-pointer select-none"
        to="#"
      >
        <span className="hidden text-right lg:block">
          <span className="block text-sm font-bold text-black dark:text-white truncate max-w-[200px]">
            {displayCompanyName}
          </span>
          <span
            className="block text-xs font-semibold"
            style={{ color: accentColor }}
          >
            {displayRole}
          </span>
        </span>

        {profile?.image && !imageError ? (
          <img
            className="w-9 h-9 border object-cover rounded-full"
            src={profile.image}
            onError={() => setImageError(true)}
            alt="User"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm transition-colors duration-200"
            style={{ backgroundColor: accentColor }}
          >
            <MdPerson size={20} />
          </div>
        )}

        <svg
          className="hidden fill-current sm:block"
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
            fill=""
          />
        </svg>
      </Link>

      {/* <!-- Dropdown Start --> */}
      {dropdownOpen && (
        <div
          className="absolute right-0 mt-3 flex w-80 flex-col rounded-xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark z-99999 overflow-hidden animate-fadeIn"
          style={{ zIndex: 99999 }}
        >
          {/* Client Company Name & Details */}
          <div className="px-5 py-3.5 bg-gray-50/90 dark:bg-meta-4/60 border-b border-stroke dark:border-strokedark">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: accentColor }}>
              <LuBuilding2 size={15} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Company / Organization
              </span>
            </div>

            <h4 className="text-sm font-bold text-black dark:text-white truncate" title={displayCompanyName}>
              {displayCompanyName}
            </h4>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-stroke/50 dark:border-strokedark/50">
              <span className="truncate flex items-center gap-1" title={displayEmail}>
                <LuMail size={12} className="shrink-0" />
                {displayEmail}
              </span>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: `${accentColor}1A`,
                  color: accentColor,
                }}
              >
                {displayRole}
              </span>
            </div>
          </div>

          {/* ACCENT COLOR THEME PICKER (TOGGLEABLE) */}
          {SHOW_THEME_COLOR_PICKER && (
            <div className="px-4 py-3 bg-white dark:bg-boxdark border-b border-stroke dark:border-strokedark">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Accent Color Theme
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs border border-black/10 transition-colors"
                  style={{ backgroundColor: accentColor }}
                />
              </div>

              {/* 8-col grid of color swatches */}
              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_THEME_COLORS.map((c) => {
                  const isSelected = accentColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleColorSelect(c.hex)}
                      className={`group relative h-6 w-full rounded transition-all duration-150 hover:scale-105 flex items-center justify-center shadow-xs cursor-pointer border ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white border-transparent'
                          : 'border-black/10 dark:border-white/10'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {isSelected && (
                        <svg
                          className="w-3.5 h-3.5 text-white drop-shadow"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Custom Color Picker */}
              <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-stroke/60 dark:border-strokedark/60 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-xs border border-black/15 transition-colors"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {PRESET_THEME_COLORS.find((c) => c.hex.toLowerCase() === accentColor.toLowerCase())?.name ||
                      'Custom Color'}
                  </span>
                </div>

                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-meta-4 transition">
                  <LuPenLine size={12} />
                  <span>Custom</span>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Action List / Log Out */}
          <div className="p-2">
            <button
              onClick={Logout}
              className="flex items-center gap-3 w-full px-3.5 py-2 rounded-md text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition duration-150 ease-in-out cursor-pointer"
            >
              <LuLogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
      {/* <!-- Dropdown End --> */}
    </ClickOutside>
  );
};

export default DropdownUser;
