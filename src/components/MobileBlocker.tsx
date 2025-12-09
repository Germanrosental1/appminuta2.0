import { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

interface MobileBlockerProps {
  children: React.ReactNode;
}

export const MobileBlocker: React.FC<MobileBlockerProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [showBlocker, setShowBlocker] = useState(false);

  useEffect(() => {
    // Pequeño retraso para evitar parpadeos durante la carga inicial
    const timer = setTimeout(() => {
      setShowBlocker(isMobile);
    }, 100);

    return () => clearTimeout(timer);
  }, [isMobile]);

  if (showBlocker) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-4 z-50">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Restringido</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-gray-800 mb-2">
              Esta aplicación está diseñada exclusivamente para uso en computadoras de escritorio.
            </p>
            <p className="text-gray-600 text-sm">
              Por favor, accede desde un dispositivo desktop para continuar.
            </p>
          </div>
          <div className="mt-6">
            <a
              href="/"
              className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors inline-block"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileBlocker;
