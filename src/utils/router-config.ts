/**
 * Notas sobre las advertencias de React Router DOM v6.30.1
 * 
 * Actualmente estamos viendo dos advertencias en la consola:
 * 
 * 1. "React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7."
 * 2. "React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7."
 * 
 * Estas advertencias son informativas y se refieren a cambios que vendrán en la versión 7 de React Router.
 * No afectan la funcionalidad actual de la aplicación.
 * 
 * Opciones para manejar estas advertencias:
 * 
 * 1. Ignorarlas por ahora, ya que son solo informativas.
 * 2. Actualizar a React Router v7 cuando esté disponible.
 * 3. Usar un filtro de consola en el navegador para ocultar estas advertencias específicas.
 * 
 * La API para silenciar estas advertencias específicas no está disponible en la versión actual.
 */

// Esta función no hace nada actualmente, pero podríamos usarla en el futuro
// para configurar React Router cuando actualicemos a v7
export function initRouterConfig() {
  // Registrar un mensaje informativo en la consola
  if (process.env.NODE_ENV === 'development') {
    console.info(
      '%cReact Router Warnings: Algunas advertencias de React Router sobre características futuras son esperadas y pueden ser ignoradas.',
      'color: #666; font-style: italic;'
    );
  }
  return true;
}
