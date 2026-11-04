import React, { useState, ReactNode, useEffect } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import Footer from '../components/Footer/index';
import { getSidebarBehaviorMode } from '../constant/themeConfig';

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const behavior = getSidebarBehaviorMode();
      if (behavior === 'auto_collapse') {
        return false;
      }
      const saved = localStorage.getItem('sidebar_expanded');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth > 750;
    }
    return false;
  });

  const handleSetSidebarOpen = (arg: boolean | ((prev: boolean) => boolean)) => {
    setSidebarOpen((prev) => {
      const nextVal = typeof arg === 'function' ? arg(prev) : arg;
      if (typeof window !== 'undefined' && window.innerWidth > 750) {
        const behavior = getSidebarBehaviorMode();
        if (behavior === 'pinned') {
          localStorage.setItem('sidebar_expanded', String(nextVal));
        }
      }
      return nextVal;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 750) {
        setSidebarOpen(false);
      } else {
        const behavior = getSidebarBehaviorMode();
        if (behavior === 'auto_collapse') {
          setSidebarOpen(false);
        } else {
          const saved = localStorage.getItem('sidebar_expanded');
          if (saved !== null) {
            setSidebarOpen(saved === 'true');
          } else {
            setSidebarOpen(true);
          }
        }
      }
    };

    const handleBehaviorChange = () => {
      const behavior = getSidebarBehaviorMode();
      if (behavior === 'auto_collapse') {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('uzair_jibran_sidebar_behavior_changed', handleBehaviorChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('uzair_jibran_sidebar_behavior_changed', handleBehaviorChange);
    };
  }, []);

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-700 dark:text-slate-200 min-h-screen font-sans selection:bg-emerald-600 selection:text-white">
      <div className="flex h-screen overflow-hidden relative w-full">
        
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={handleSetSidebarOpen} />

        {/* Content Column: Fixed Header on top, scrollable content underneath */}
        <div className="relative flex flex-1 flex-col h-screen overflow-hidden duration-300 ease-in-out w-full min-w-0">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={handleSetSidebarOpen} />

          <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden w-full">
            <main className="flex-1 bg-[#F8FAFC] dark:bg-[#0B0F17] w-full relative">
              {/* Subtle top ambient cyan glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/5 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/5 dark:to-transparent" />
              
              <div className="relative mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-8 w-full">
                {children}
              </div>
            </main>

            <Footer />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DefaultLayout;
