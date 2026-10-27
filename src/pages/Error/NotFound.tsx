import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdErrorOutline, MdArrowBack, MdDashboard } from 'react-icons/md';
import IconDark from '../../images/logo/icon-dark.png';
import DarkModeSwitcher from '../../components/Header/DarkModeSwitcher';
import { useAuth } from '../../Context/Auth';
import { getBrandConfig } from '../../utils/brand';

interface NotFoundProps {
  title?: string;
  message?: string;
}

const NotFound: React.FC<NotFoundProps> = ({
  title = '404 - Page Not Found',
  message = 'The page or organization portal you requested could not be found or you do not have permission to access it.'
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const brand = getBrandConfig();
  const companyTitle = `${brand.brandWord1} ${brand.brandWord2}`;
  const companySubtitle = brand.brandSuffix;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // If authenticated and inside DefaultLayout, render the card directly without duplicate header/footer
  if (isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center py-16 sm:py-24">
        <div className="max-w-md w-full bg-white dark:bg-boxdark border border-stroke dark:border-strokedark p-8 sm:p-10 rounded-2xl shadow-default space-y-6 transition-colors duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-danger mx-auto flex items-center justify-center text-3xl shadow-xs">
            <MdErrorOutline />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-black dark:text-white tracking-tight">{title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">{message}</p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <MdArrowBack className="text-sm" /> Previous Page
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-opacity-90 text-white font-bold text-xs transition shadow-md cursor-pointer"
            >
              <MdDashboard className="text-sm" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standalone mode for unauthenticated visits
  return (
    <div className="min-h-screen bg-gray-50 text-body dark:bg-boxdark-2 dark:text-bodydark flex flex-col justify-between font-sans transition-colors duration-200">
      {/* TOP NAVBAR */}
      <header className="border-b border-stroke bg-white dark:border-strokedark dark:bg-boxdark px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img src={IconDark} alt="Logo" className="h-9 w-auto" />
          <span className="font-black text-base text-black dark:text-white tracking-tight">
            {companyTitle} <span className="text-primary">{companySubtitle}</span>
          </span>
        </div>

        <div>
          <DarkModeSwitcher />
        </div>
      </header>

      {/* ERROR CARD CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-boxdark border border-stroke dark:border-strokedark p-8 sm:p-10 rounded-2xl shadow-default space-y-5 transition-colors duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-danger mx-auto flex items-center justify-center text-3xl shadow-xs">
            <MdErrorOutline />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-black dark:text-white tracking-tight">{title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">{message}</p>
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <MdArrowBack className="text-sm" /> Previous Page
            </button>
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-opacity-90 text-white font-bold text-xs transition shadow-md cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-stroke dark:border-strokedark py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} NHT ENTERPRISES by Abdul Sattar. All rights reserved.
      </footer>
    </div>
  );
};

export default NotFound;
