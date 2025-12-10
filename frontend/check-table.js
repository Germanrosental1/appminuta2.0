// Script para verificar si la tabla mapadeventas tiene datos
import { createClient } from '@supabase/supabase-js';

import { fileURLToPath } from 'url';
import { dirname } from 'node:path';
import { config } from 'dotenv';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config();

// Obtener las variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMapadeventasTable() {
  console.log('Verificando tabla mapadeventas...');
  console.log('URL de Supabase:', supabaseUrl);

  try {
    // Intentar obtener todos los datos
    const { data, error } = await supabase
      .from('mapadeventas')
      .select('*', { count: 'exact' });

    console.log('Resultado de la consulta:');
    console.log('- Error:', error);

    // Verificar si la tabla existe
    if (error && error.code === '42P01') {
      console.error('La tabla mapadeventas no existe');
      return;
    }

    // Verificar si hay datos
    if (!data || data.length === 0) {
      console.warn('La tabla mapadeventas está vacía');
    } else {
      console.log('La tabla mapadeventas tiene datos');
      console.log('Cantidad de registros:', data.length);
      console.log('Primer registro:', data[0]);
      console.log('Campos disponibles:', Object.keys(data[0]));
    }
  } catch (error) {
    console.error('Error al consultar la tabla:', error);
  }
}

// Ejecutar la función
checkMapadeventasTable()
  .then(() => {
    console.log('Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en la verificación:', error);
    process.exit(1);
  });
