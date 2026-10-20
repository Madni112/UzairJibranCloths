import { useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

const useColorMode = () => {
  const [colorMode, setColorMode] = useLocalStorage('color-theme', 'light');

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;
    const htmlClass = window.document.documentElement.classList;

    if (colorMode === 'dark') {
      bodyClass.add(className);
      htmlClass.add(className);
    } else {
      bodyClass.remove(className);
      htmlClass.remove(className);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('color-mode-changed'));
      window.dispatchEvent(new Event('zoaib_ali_sidebar_color_changed'));
    }
  }, [colorMode]);

  return [colorMode, setColorMode];
};

export default useColorMode;
