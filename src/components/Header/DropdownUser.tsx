import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClickOutside from '../ClickOutside';
import { LuLogOut, LuBuilding2, LuMail, LuSettings, LuLanguages } from 'react-icons/lu';
import { MdPerson } from 'react-icons/md';
import { useAuth, detectPortalTenant } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';
import { getBrandConfig } from '../../utils/brand';
import { supabase } from '../../Context/supabaseClient';
import {
  applyAccentColor,
  getSavedAccentColor,
  getContrastTextColor,
  isDarkModeActive,
} from '../../constant/themeConfig';

const DropdownUser = () => {
  const { logout, businessName: authBusinessName, userEmail, role, currentUser } = useAuth();
  const { language, isRTL, toggleLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<any>();
  const [imageError, setImageError] = useState(false);
  const [accentColor, setAccentColor] = useState<string>(getSavedAccentColor());
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

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

    const themeHandler = () => {
      setAccentColor(getSavedAccentColor());
    };
    window.addEventListener('uzair_jibran_theme_color_changed', themeHandler);
    return () => {
      window.removeEventListener('uzair_jibran_theme_color_changed', themeHandler);
    };
  }, []);

  const Logout = () => {
    logout();
  };

  const brand = getBrandConfig();
  const displayEmail = userEmail || profile?.email || brand.adminEmail;
  const displayRole = role || profile?.role || 'Super Admin';
  const displayCompanyName = authBusinessName || brand.name;
  const displayName = profile?.user_metadata?.full_name || profile?.user_metadata?.name || displayCompanyName;
  const isLightAccent = getContrastTextColor(accentColor) === '#0F172A';
  const roleTextColor = isLightAccent && !isDarkModeActive() ? '#0F172A' : accentColor;

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative z-9999 shrink-0">
      <Link
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
        to="#"
      >
        <span className="hidden text-right lg:block shrink-0">
          <span className="block text-xs sm:text-sm font-bold text-black dark:text-white truncate max-w-[110px] xl:max-w-[150px]">
            {displayCompanyName}
          </span>
          <span
            className="block text-[11px] font-semibold"
            style={{ color: roleTextColor }}
          >
            {displayRole}
          </span>
        </span>

        {profile?.image && !imageError ? (
          <img
            className="w-8.5 h-8.5 border object-cover rounded-full shrink-0"
            src={profile.image}
            onError={() => setImageError(true)}
            alt="User"
          />
        ) : (
          <div
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors duration-200 shrink-0 border border-slate-200/80 dark:border-slate-700/80"
            style={{
              backgroundColor: accentColor,
              color: getContrastTextColor(accentColor),
            }}
          >
            <MdPerson size={18} />
          </div>
        )}

        <svg
          className="hidden fill-current sm:block shrink-0"
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
            <div className="flex items-center gap-1.5 mb-1" style={{ color: roleTextColor }}>
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
                  backgroundColor: isLightAccent && !isDarkModeActive() ? '#F1F5F9' : `${accentColor}1A`,
                  color: roleTextColor,
                  border: isLightAccent && !isDarkModeActive() ? '1px solid #CBD5E1' : undefined,
                }}
              >
                {displayRole}
              </span>
            </div>
          </div>

          {/* Action List: Settings, Language & Log Out */}
          <div className="p-2 space-y-1">
            {/* Quick Language Toggle */}
            <button
              type="button"
              onClick={() => {
                toggleLanguage();
              }}
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-meta-4/40 transition duration-150 ease-in-out cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <LuLanguages size={17} className="text-primary shrink-0" />
                <span>{isRTL ? 'زبان تبدیل کریں' : 'Switch Language'}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {isRTL ? '🇬🇧 English' : '🇵🇰 اردو'}
              </span>
            </button>

            <Link
              to="/settings"
              onClick={() => setDropdownOpen(false)}
              onMouseEnter={() => setIsSettingsHovered(true)}
              onMouseLeave={() => setIsSettingsHovered(false)}
              className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-150 ease-in-out cursor-pointer group"
              style={{
                backgroundColor: isSettingsHovered ? `${accentColor}18` : undefined,
                color: isSettingsHovered ? roleTextColor : undefined,
              }}
            >
              <LuSettings
                size={17}
                className="transition-colors"
                style={{
                  color: isSettingsHovered ? roleTextColor : undefined,
                }}
              />
              <span>Settings</span>
            </Link>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            <button
              onClick={Logout}
              className="flex items-center gap-3 w-full px-3.5 py-2 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition duration-150 ease-in-out cursor-pointer"
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
