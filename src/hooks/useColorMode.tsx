import { useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

const useColorMode = () => {
  const [colorMode, setColorMode] = useLocalStorage('color-theme', 'light');

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;
    const docClass = window.document.documentElement.classList;

    if (colorMode === 'dark') {
      bodyClass.add(className);
      docClass.add(className);
    } else {
      bodyClass.remove(className);
      docClass.remove(className);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('color-mode-changed', { detail: colorMode }));
      window.dispatchEvent(new Event('uzair_jibran_sidebar_color_changed'));
    }
  }, [colorMode]);

  useEffect(() => {
    const handleSync = (e?: any) => {
      try {
        const item = window.localStorage.getItem('color-theme');
        const parsed = item ? JSON.parse(item) : (e?.detail || null);
        if (parsed && (parsed === 'light' || parsed === 'dark') && parsed !== colorMode) {
          setColorMode(parsed);
        }
      } catch (err) {}
    };

    window.addEventListener('color-mode-changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('color-mode-changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [colorMode, setColorMode]);

  return [colorMode, setColorMode];
};

export default useColorMode;
