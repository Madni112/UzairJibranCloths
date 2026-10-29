import { Toaster, useToasterStore } from 'react-hot-toast';
import Navigation from './Navigation/Routing';
import { ModalProvider } from './Context/Modal';
import { LanguageProvider } from './Context/LanguageContext';
import { useEffect, useRef } from 'react';
import { initializeSocket } from './service/socket';
import { AuthProvider, useAuth } from './Context/Auth';
import Alert from './pages/Alert';
import { applyAccentColor, getSavedAccentColor } from './constant/themeConfig';
import { triggerFeedbackSound } from './utils/audioFeedback';

const ToastSoundHandler = () => {
  const { toasts } = useToasterStore();
  const { userEmail } = useAuth();
  const seenToasts = useRef<Set<string>>(new Set());

  useEffect(() => {
    toasts.forEach((t) => {
      if (t.visible && !seenToasts.current.has(t.id)) {
        seenToasts.current.add(t.id);
        if (t.id === 'silent-tone-toast') return;
        if (t.type === 'error') {
          triggerFeedbackSound('warning', userEmail);
        } else {
          triggerFeedbackSound('notification', userEmail);
        }
      }
    });

    if (seenToasts.current.size > 80) {
      const activeIds = new Set(toasts.map((t) => t.id));
      seenToasts.current.forEach((id) => {
        if (!activeIds.has(id)) seenToasts.current.delete(id);
      });
    }
  }, [toasts, userEmail]);

  return null;
};

function App() {
  useEffect(() => {
    applyAccentColor(getSavedAccentColor());
    initializeSocket();
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <ModalProvider>
          <Navigation />
          <Toaster
            position="top-right"
            reverseOrder={false}
            containerClassName="overflow-auto"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
          <ToastSoundHandler />
          <Alert />
        </ModalProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
