# Guía de Contribución - AppMinuta

¡Gracias por tu interés en contribuir a AppMinuta! Esta guía te ayudará a navegar por el proceso de contribución.

## 🧵 Flujo de Trabajo (Git Flow)

Este proyecto sigue una estrategia de ramas basada en **Feature Branches**:

1.  **Main Branch**: `main` (Producción). Protegida.
2.  **Branches**: Nombres descriptivos `feature/nombre-feature`, `fix/nombre-bug`, `chore/tareas-mantenimiento`.

### Pasos para contribuir:

1.  **Hacer Fork/Clone** del repositorio.
2.  **Crear una rama** para tu tarea:
    ```bash
    git checkout -b feature/nueva-funcionalidad
    ```
3.  **Realizar cambios** siguiendo las guías de estilo.
4.  **Testear**:
    - Backend: `npm test`
    - Frontend: `npm test` y `npx playwright test` (si aplica)
5.  **Commit** (Usamos Conventional Commits):
    ```bash
    git commit -m "feat: agregar validación de emails"
    git commit -m "fix(auth): corregir error en login"
    ```
6.  **Push** a tu rama:
    ```bash
    git push origin feature/nueva-funcionalidad
    ```
7.  **Crear Pull Request (PR)** hacia `main`.

## 📐 Estándares de Código

### General
- Rutas relativas para imports internos.
- No dejar `console.log` en producción.
- Eliminar código muerto/comentado.

### Backend (NestJS)
- Usar DTOs para transferencia de datos.
- Documentar endpoints con Swagger decorators.
- Manejar errores con Exceptions personalizadas, no genéricas.
- Seguir arquitectura modular.

### Frontend (React)
- Usar Functional Components y Hooks.
- Evitar `any` (TypeScript strict mode).
- Componentes pequeños y reutilizables.
- Colocar lógica de negocio en Custom Hooks o Services, no en la UI.

## 🧪 Testing

- **Backend**: Coverage > 15% (Mejorando).
- **Frontend**: Tests unitarios para utilidades y hooks complejos.
- **E2E**: Tests críticos de flujo de usuario.

## 📝 Documentación

- Si modificas una API, actualiza el DTO y los decoradores de Swagger.
- Si agregas una variable de entorno, actualiza el `.env.example`.

---
© 2026 AppMinuta Team
