# Creación de Usuarios de Demostración

Este documento explica cómo crear usuarios de demostración en la aplicación usando los scripts proporcionados.

## Usuarios a Crear

### Usuario 1: Administración
- **Email:** Paco.seminoAdmin@gmail.com
- **Password:** Macluctoc&510
- **Rol:** administracion
- **Permisos:** Acceso completo al dashboard de administración

### Usuario 2: Comercial
- **Email:** Paco.seminoComercial@gmail.com
- **Password:** Macluctoc&510
- **Rol:** comercial
- **Permisos:** Crear minutas y ver historial propio

---

## Método 1: Script Node.js (Recomendado)

Este método usa la API de administración de Supabase y es el más confiable.

### Requisitos Previos

1. Tener Node.js instalado
2. Tener acceso al dashboard de Supabase
3. Obtener la clave de servicio (service_role_key)

### Pasos

#### 1. Obtener la Service Role Key

1. Ve al dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. Copia la clave **service_role** (NO la anon key)
   - ⚠️ **IMPORTANTE:** Esta clave tiene privilegios completos, nunca la expongas en el cliente

#### 2. Configurar Variables de Entorno

Agrega la siguiente línea a tu archivo `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

Tu archivo `.env` debería tener algo así:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

#### 3. Ejecutar el Script

Desde la raíz del proyecto:

```bash
node crear-usuarios-demo.js
```

#### 4. Verificar Resultado

El script mostrará:
- ✅ Si los usuarios se crearon exitosamente
- 📋 Una tabla con los usuarios creados
- 📝 Las credenciales de acceso

---

## Método 2: Script SQL

Este método requiere que primero crees los usuarios desde el dashboard de Supabase.

### Pasos

#### 1. Crear Usuarios en Auth

1. Ve al dashboard de Supabase
2. Ve a **Authentication** > **Users**
3. Click en **Add user** > **Create new user**

Para cada usuario:

**Usuario Admin:**
- Email: `Paco.seminoAdmin@gmail.com`
- Password: `Macluctoc&510`
- Auto Confirm User: ✓ (activado)

**Usuario Comercial:**
- Email: `Paco.seminoComercial@gmail.com`
- Password: `Macluctoc&510`
- Auto Confirm User: ✓ (activado)

#### 2. Ejecutar Script SQL

1. Ve a **SQL Editor** en el dashboard de Supabase
2. Abre el archivo `sql/crear_usuarios_demo.sql`
3. Copia y pega todo el contenido
4. Click en **Run**

El script:
- Buscará los usuarios creados en auth.users
- Creará/actualizará sus perfiles en la tabla profiles
- Asignará los roles correspondientes
- Mostrará un resumen de los usuarios

---

## Método 3: Manual (Dashboard de Supabase)

Si prefieres hacerlo completamente manual:

### Paso 1: Crear Usuarios en Authentication

1. Ve a **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Llena los datos según la tabla de arriba
4. Activa **Auto Confirm User**
5. Repite para ambos usuarios

### Paso 2: Crear Perfiles en la Tabla

1. Ve a **Table Editor** > **profiles**
2. Click **Insert** > **Insert row**

Para cada usuario, inserta:

**Usuario Admin:**
```
id: [copia el UUID del usuario desde Authentication]
email: paco.seminoadmin@gmail.com
nombre: Paco
apellido: Semino Admin
role: administracion
activo: true
require_password_change: false
first_login: false
```

**Usuario Comercial:**
```
id: [copia el UUID del usuario desde Authentication]
email: paco.seminocomercial@gmail.com
nombre: Paco
apellido: Semino Comercial
role: comercial
activo: true
require_password_change: false
first_login: false
```

---

## Verificación

Después de crear los usuarios por cualquier método:

### 1. Verificar en la Base de Datos

Ejecuta esta query en SQL Editor:

```sql
SELECT 
  p.id,
  p.email,
  p.nombre,
  p.apellido,
  p.role,
  p.activo,
  p.created_at
FROM profiles p
WHERE p.email IN ('paco.seminoadmin@gmail.com', 'paco.seminocomercial@gmail.com')
ORDER BY p.email;
```

Deberías ver 2 usuarios con sus respectivos roles.

### 2. Probar Login en la Aplicación

1. Ve a la aplicación (localhost:5173 o tu URL de producción)
2. Intenta iniciar sesión con cada usuario
3. Verifica que cada uno acceda a su dashboard correspondiente:
   - Admin → Dashboard de Administración
   - Comercial → Dashboard Comercial

---

## Solución de Problemas

### Error: "User already registered"

- **Causa:** El usuario ya existe en auth.users
- **Solución:** El script Node.js maneja esto automáticamente. Si usas SQL, asegúrate de que el usuario exista primero.

### Error: "SUPABASE_SERVICE_ROLE_KEY not found"

- **Causa:** Falta la variable de entorno
- **Solución:** Agrega la clave al archivo `.env` según las instrucciones arriba

### Error: "Permission denied for table profiles"

- **Causa:** La service_role_key no tiene permisos o estás usando la anon key
- **Solución:** Verifica que estés usando la **service_role** key, no la anon key

### Los usuarios se crean pero no pueden hacer login

- **Causa:** El email no está confirmado
- **Solución:** 
  - Si usas el script Node.js, verifica que `email_confirm: true`
  - Si usas el dashboard, marca **Auto Confirm User**
  - O confirma manualmente en Authentication > Users > [usuario] > Confirm email

### Usuario no aparece en la tabla profiles

- **Causa:** No se ejecutó la segunda parte del script o no existe el trigger
- **Solución:** Ejecuta manualmente el INSERT en la tabla profiles con el ID del usuario

---

## Seguridad

⚠️ **IMPORTANTE:**

1. **Nunca** expongas la `SUPABASE_SERVICE_ROLE_KEY` en el código del cliente
2. **Nunca** subas el archivo `.env` a Git
3. Cambia las contraseñas en producción
4. Estas credenciales son solo para desarrollo/demostración
5. En producción, usa contraseñas seguras y únicas

---

## Notas Adicionales

- Los usuarios creados tienen `require_password_change: false`, lo que significa que no se les pedirá cambiar la contraseña en el primer login
- Ambos usuarios tienen `activo: true`, lo que les permite acceder al sistema
- El campo `first_login: false` indica que no es su primera vez ingresando
- Los roles disponibles son: `comercial` y `administracion`

---

## Eliminar Usuarios de Prueba

Si necesitas eliminar estos usuarios:

### Opción 1: Dashboard

1. Ve a **Authentication** > **Users**
2. Busca el usuario
3. Click en los 3 puntos > **Delete user**
4. El perfil se eliminará automáticamente si tienes ON DELETE CASCADE

### Opción 2: SQL

```sql
-- Esto eliminará el usuario de auth.users y su perfil automáticamente
DELETE FROM auth.users 
WHERE email IN ('paco.seminoadmin@gmail.com', 'paco.seminocomercial@gmail.com');
```

---

## Contacto

Si tienes problemas o preguntas, contacta al equipo de desarrollo.
