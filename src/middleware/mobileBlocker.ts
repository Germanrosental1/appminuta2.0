// Middleware para bloquear dispositivos móviles
import { Connect } from 'vite';

// Lista de patrones de User-Agent para dispositivos móviles
const MOBILE_USER_AGENTS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /IEMobile/i,
  /Mobile/i,
  /Tablet/i
];

// Rutas que están exentas del bloqueo móvil (opcional)
const EXEMPT_ROUTES = [
  '/api/',
  '/mobile-blocked.html'
];

// Función para detectar si es un dispositivo móvil
function isMobileDevice(userAgent: string): boolean {
  return MOBILE_USER_AGENTS.some(regex => regex.test(userAgent));
}

// Función para verificar si la ruta está exenta
function isExemptRoute(url: string): boolean {
  return EXEMPT_ROUTES.some(route => url.startsWith(route));
}

// Contenido HTML para la página de bloqueo móvil
const mobileBlockedHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso Restringido</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #f9fafb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .container {
      max-width: 500px;
      text-align: center;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      padding: 24px;
    }
    h1 {
      color: #dc2626;
      margin-top: 0;
    }
    .message {
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .primary-text {
      color: #1f2937;
      margin-bottom: 8px;
    }
    .secondary-text {
      color: #6b7280;
      font-size: 0.9em;
    }
    .logo {
      margin-bottom: 24px;
      width: 80px;
      height: 80px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Acceso Restringido</h1>
    <div class="message">
      <p class="primary-text">
        Esta aplicación está diseñada exclusivamente para uso en computadoras de escritorio.
      </p>
      <p class="secondary-text">
        Por favor, accede desde un dispositivo desktop para continuar.
      </p>
    </div>
  </div>
</body>
</html>
`;

// Middleware de Vite para bloquear dispositivos móviles
export function mobileBlockerMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    // Obtener el User-Agent
    const userAgent = req.headers['user-agent'] || '';
    
    // Verificar si es una ruta exenta
    if (isExemptRoute(req.url || '')) {
      return next();
    }
    
    // Verificar si es un dispositivo móvil
    if (isMobileDevice(userAgent)) {
      // Enviar respuesta de bloqueo
      res.writeHead(403, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(mobileBlockedHtml);
      return;
    }
    
    // Continuar con la solicitud si no es un dispositivo móvil
    next();
  };
}

export default mobileBlockerMiddleware;
