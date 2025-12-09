import { supabase } from '../lib/supabase';

// Interfaz para la tabla tablas
export interface UnidadTabla {
  id: number;
  natdelproyecto?: string;
  proyecto?: string;
  etapa?: string;
  tipo?: string;
  sectorid: string;
  edificiotorre?: string;
  piso?: string;
  nrounidad?: string;
  dormitorios?: string;
  frente?: string;
  manzana?: string;
  destino?: string;
  tipocochera?: string;
  tamano?: string;
  m2cubiertos?: number;
  m2semicubiertos?: number;
  m2exclusivos?: number;
  m2patioterraza?: number;
  patioterraza?: string;
  m2comunes?: number;
  m2calculo?: number;
  m2totales?: number;
  preciousd?: number;
  usdm2?: number;
  estado?: string;
  motivonodisp?: string;
  obs?: string;
  fechareserva?: string;
  comercial?: string;
  clienteinteresado?: string;
  fechafirmaboleto?: string;
  clientetitularboleto?: string;
  fechaposesionporboletocompraventa?: string;
  deptocomprador?: string;
}

// Alias para mantener compatibilidad con código existente
export type UnidadMapaVentas = UnidadTabla;
export type UnidadArboria = UnidadTabla;

// Interfaz simplificada para mostrar en listas
export interface UnidadResumen {
  id: number;
  proyecto: string;
  sector?: string;
  tipo?: string;
  numero?: string;
  edificio?: string;
  piso?: string;
  dormitorios?: string;
  metrosTotales?: number;
  precioUSD?: number;
  estado?: string;
  descripcion: string; // Campo calculado para mostrar en UI
}

/**
 * Obtener todos los proyectos disponibles en la tabla 'tablas'
 */
export async function getProyectosDisponibles(): Promise<string[]> {
  try {


    // Verificar si el usuario está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    // console.log('Sesión actual:', session ? 'Autenticado' : 'No autenticado');

    // Verificar si la tabla 'tablas' existe
    // console.log('Verificando si la tabla "tablas" existe...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('tablas')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Error al verificar tabla "tablas":', testError);
      } else {
        // console.log('Tabla "tablas" existe y es accesible');
      }
    } catch (e) {
      console.error('Error al verificar tabla "tablas":', e);
    }

    // Método 1: Consulta directa para obtener proyectos únicos
    // console.log('Método 1: Consultando proyectos únicos directamente...');
    try {
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('tablas')
        .select('proyecto')
        .not('proyecto', 'is', null)
        .order('proyecto');



      if (!proyectosError && proyectosData && proyectosData.length > 0) {
        // Extraer los nombres de proyectos y eliminar duplicados
        const proyectosSet = new Set(proyectosData.map((row: any) => row.proyecto).filter(Boolean));
        const proyectos = Array.from(proyectosSet);
        // console.log(`Proyectos únicos obtenidos (${proyectos.length}):`, proyectos);

        if (proyectos.length > 0) {
          return proyectos;
        }
      }
    } catch (e) {
      console.error('Error en método 1:', e);
    }

    // Método 2: Usar SQL directo para obtener proyectos únicos
    // console.log('Método 2: Usando SQL directo para obtener proyectos únicos...');
    try {
      const { data: proyectosData, error: proyectosError } = await supabase
        .rpc('get_unique_projects_from_tablas');



      if (!proyectosError && proyectosData && proyectosData.length > 0) {
        // console.log(`Proyectos únicos obtenidos por RPC (${proyectosData.length}):`, proyectosData);
        return proyectosData;
      }
    } catch (e) {
      console.error('Error en método 2:', e);
    }

    // Método 3: Consulta alternativa usando natdelproyecto
    console.log('Método 3: Consultando campo natdelproyecto...');
    try {
      const { data: proyectosData, error: proyectosError } = await supabase
        .from('tablas')
        .select('natdelproyecto')
        .not('natdelproyecto', 'is', null)
        .order('natdelproyecto');

      if (!proyectosError && proyectosData && proyectosData.length > 0) {
        // Extraer los nombres de proyectos y eliminar duplicados
        const proyectosSet = new Set(proyectosData.map((row: any) => row.natdelproyecto).filter(Boolean));
        const proyectos = Array.from(proyectosSet);
        console.log(`Proyectos únicos por natdelproyecto (${proyectos.length}):`, proyectos);

        if (proyectos.length > 0) {
          return proyectos;
        }
      }
    } catch (e) {
      console.error('Error en método 3:', e);
    }

    // Método 4: Consulta directa de todos los registros
    console.log('Método 4: Consultando todos los registros...');
    try {
      // Obtener una muestra de registros para analizar la estructura
      const { data: sampleData, error: sampleError } = await supabase
        .from('tablas')
        .select('*')
        .limit(5);

      if (sampleError) {
        console.error('Error al obtener muestra de datos:', sampleError);
      } else if (sampleData && sampleData.length > 0) {
        console.log('Muestra de datos obtenida. Campos disponibles:', Object.keys(sampleData[0]));

        // Determinar qué campo contiene el nombre del proyecto
        const camposProyecto = ['proyecto', 'natdelproyecto', 'Proyecto', 'PROYECTO', 'proyecto_nombre'];
        let campoProyecto = camposProyecto.find(campo => sampleData[0][campo] !== undefined) || 'proyecto';
        console.log(`Usando campo ${campoProyecto} para obtener proyectos`);

        // Obtener todos los registros para extraer proyectos únicos
        const { data: allData, error: allError } = await supabase
          .from('tablas')
          .select(campoProyecto)
          .not(campoProyecto, 'is', null)
          .order(campoProyecto);

        if (allError) {
          console.error(`Error al obtener proyectos usando campo ${campoProyecto}:`, allError);
        } else if (allData && allData.length > 0) {
          // Extraer proyectos únicos
          const proyectosUnicos = Array.from(new Set(
            allData
              .map(item => item[campoProyecto])
              .filter(proyecto => proyecto !== null && proyecto !== undefined)
          ));

          console.log(`Proyectos únicos encontrados (${proyectosUnicos.length}):`, proyectosUnicos);

          if (proyectosUnicos.length > 0) {
            return proyectosUnicos;
          }
        }
      }
    } catch (e) {
      console.error('Error en método 4:', e);
    }

    // Si todo lo anterior falla, devolver una lista predeterminada con más proyectos de ejemplo
    console.log('Todos los métodos fallaron, devolviendo proyectos por defecto');
    const proyectosPorDefecto = [
      'Arboria',
      'Edificio Central',
      'Torres del Norte',
      'Residencial Sur',
      'Parque Urbano'
    ];

    console.log('Proyectos por defecto:', proyectosPorDefecto);
    return proyectosPorDefecto;
  } catch (error) {
    console.error('Error inesperado al obtener proyectos:', error);
    // En caso de error, devolver proyectos por defecto
    return ['Arboria'];
  }
}

/**
 * Obtener todas las unidades disponibles por estado
 */
export async function getUnidadesPorEstado(estado: string = 'disponible'): Promise<UnidadResumen[]> {
  try {
    console.log(`Obteniendo unidades con estado: ${estado}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('*')
      .eq('estado', estado)
      .order('proyecto', { ascending: true })
      .order('sectorid', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.error(`Error al obtener unidades con estado ${estado}:`, error);
      return [];
    }

    // Convertir a formato resumido
    const unidadesResumen = data.map(unidad => formatearUnidadResumen(unidad));

    console.log(`Se encontraron ${unidadesResumen.length} unidades con estado ${estado}`);
    return unidadesResumen;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades con estado ${estado}:`, error);
    return [];
  }
}

/**
 * Obtener todas las unidades de un proyecto
 */
export async function getUnidadesPorProyecto(proyecto: string): Promise<UnidadResumen[]> {
  try {
    console.log(`Obteniendo unidades del proyecto: ${proyecto}`);

    // Intentar con diferentes variantes del nombre del proyecto
    const variantes = [
      proyecto,
      proyecto.toLowerCase(),
      proyecto.toUpperCase(),
      proyecto.charAt(0).toUpperCase() + proyecto.slice(1).toLowerCase()
    ];

    let data = null;

    // Intentar con cada variante del nombre
    for (const variante of variantes) {
      console.log(`Intentando con variante: ${variante}`);
      const result = await supabase
        .from('tablas')
        .select('*')
        .eq('proyecto', variante)
        .order('sectorid', { ascending: true })
        .order('id', { ascending: true });

      if (result.data && result.data.length > 0) {
        data = result.data;
        console.log(`Encontradas ${data.length} unidades con variante: ${variante}`);
        break;
      }
    }

    if (!data || data.length === 0) {
      console.warn(`No se encontraron unidades para el proyecto ${proyecto}`);
      return [];
    }

    // Convertir a formato resumido
    const unidadesResumen = data.map(unidad => formatearUnidadResumen(unidad));

    return unidadesResumen;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades del proyecto ${proyecto}:`, error);
    return [];
  }
}

/**
 * Obtener una unidad específica por ID
 */
export async function getUnidadById(id: number): Promise<UnidadMapaVentas | null> {
  try {
    console.log(`Obteniendo unidad con ID: ${id}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error al obtener unidad con ID ${id}:`, error);
      return null;
    }

    return data as UnidadMapaVentas;
  } catch (error) {
    console.error(`Error inesperado al obtener unidad con ID ${id}:`, error);
    return null;
  }
}

/**
 * Función auxiliar para formatear una unidad en formato resumido
 */
function formatearUnidadResumen(unidad: UnidadTabla): UnidadResumen {
  // Crear descripción para mostrar en UI
  let descripcion = '';

  if (unidad.sectorid) descripcion += `${unidad.sectorid} - `;
  if (unidad.edificiotorre) descripcion += `${unidad.edificiotorre} - `;
  if (unidad.piso) descripcion += `Piso ${unidad.piso} - `;
  if (unidad.nrounidad) descripcion += `Unidad ${unidad.nrounidad}`;

  // Si no hay suficientes datos, usar ID
  if (!descripcion || descripcion.endsWith(' - ')) {
    descripcion += `ID: ${unidad.id}`;
  }

  return {
    id: unidad.id,
    proyecto: unidad.proyecto || '',
    sector: unidad.sectorid,
    tipo: unidad.tipo,
    numero: unidad.nrounidad,
    edificio: unidad.edificiotorre,
    piso: unidad.piso,
    dormitorios: unidad.dormitorios,
    metrosTotales: unidad.m2totales,
    precioUSD: unidad.preciousd,
    estado: unidad.estado,
    descripcion: descripcion.trim()
  };
}

/**
 * Obtener todas las naturalezas de proyecto disponibles
 */
export async function getNaturalezasProyecto(): Promise<string[]> {
  try {
    console.log('Obteniendo naturalezas de proyecto...');

    const { data, error } = await supabase
      .from('tablas')
      .select('natdelproyecto')
      .not('natdelproyecto', 'is', null)
      .order('natdelproyecto');

    if (error) {
      console.error('Error al obtener naturalezas de proyecto:', error);
      return [];
    }

    // Extraer naturalezas únicas
    const naturalezasSet = new Set(
      data
        .map(item => item.natdelproyecto)
        .filter(Boolean)
    );

    const naturalezas = Array.from(naturalezasSet);
    console.log(`Se encontraron ${naturalezas.length} naturalezas de proyecto`);
    return naturalezas;
  } catch (error) {
    console.error('Error inesperado al obtener naturalezas de proyecto:', error);
    return [];
  }
}

/**
 * Obtener todas las etapas disponibles para un proyecto específico
 */
export async function getEtapasPorProyecto(nombreProyecto: string): Promise<string[]> {
  try {
    console.log(`Obteniendo etapas para el proyecto: ${nombreProyecto}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('etapa')
      .eq('proyecto', nombreProyecto)
      .not('etapa', 'is', null)
      .order('etapa');

    if (error) {
      console.error(`Error al obtener etapas para proyecto ${nombreProyecto}:`, error);
      return ['Ninguna'];
    }

    // Extraer etapas únicas
    const etapasSet = new Set(
      data
        .map(item => item.etapa)
        .filter(Boolean)
    );

    const etapas = Array.from(etapasSet);
    console.log(`Se encontraron ${etapas.length} etapas para proyecto ${nombreProyecto}`);

    // Si no hay etapas, devolver "Ninguna" como opción
    if (etapas.length === 0) {
      console.log(`No se encontraron etapas para proyecto ${nombreProyecto}, agregando opción "Ninguna"`);
      return ['Ninguna'];
    }

    return etapas;
  } catch (error) {
    console.error(`Error inesperado al obtener etapas para proyecto ${nombreProyecto}:`, error);
    return ['Ninguna'];
  }
}

/**
 * Obtener todos los proyectos disponibles para una naturaleza específica
 */
export async function getProyectosPorNaturaleza(naturaleza: string): Promise<string[]> {
  try {
    console.log(`Obteniendo proyectos para naturaleza: ${naturaleza}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('proyecto')
      .eq('natdelproyecto', naturaleza)
      .not('proyecto', 'is', null)
      .order('proyecto');

    if (error) {
      console.error(`Error al obtener proyectos para naturaleza ${naturaleza}:`, error);
      return [];
    }

    // Extraer proyectos únicos
    const proyectosSet = new Set(
      data
        .map(item => item.proyecto)
        .filter(Boolean)
    );

    const proyectos = Array.from(proyectosSet);
    console.log(`Se encontraron ${proyectos.length} proyectos para naturaleza ${naturaleza}`);
    return proyectos;
  } catch (error) {
    console.error(`Error inesperado al obtener proyectos para naturaleza ${naturaleza}:`, error);
    return [];
  }
}

/**
 * Obtener todos los tipos disponibles para un proyecto y etapa específicos
 */
export async function getTiposPorProyectoYEtapa(nombreProyecto: string, etapa: string): Promise<string[]> {
  try {
    console.log(`Obteniendo tipos para el proyecto: ${nombreProyecto} y etapa: ${etapa}`);

    // Si la etapa es "Ninguna", buscar sin filtrar por etapa
    let query = supabase
      .from('tablas')
      .select('tipo')
      .eq('proyecto', nombreProyecto)
      .not('tipo', 'is', null);

    // Solo filtrar por etapa si no es "Ninguna"
    if (etapa !== 'Ninguna') {
      query = query.eq('etapa', etapa);
    }

    const { data, error } = await query.order('tipo');

    if (error) {
      console.error(`Error al obtener tipos para proyecto ${nombreProyecto} y etapa ${etapa}:`, error);
      return [];
    }

    // Extraer tipos únicos
    const tiposSet = new Set(
      data
        .map(item => item.tipo)
        .filter(Boolean)
    );

    const tipos = Array.from(tiposSet);
    console.log(`Se encontraron ${tipos.length} tipos para proyecto ${nombreProyecto} y etapa ${etapa}`);
    return tipos;
  } catch (error) {
    console.error(`Error inesperado al obtener tipos para proyecto ${nombreProyecto} y etapa ${etapa}:`, error);
    return [];
  }
}

/**
 * Obtener todos los tipos disponibles para un proyecto específico
 */
export async function getTiposPorProyecto(nombreProyecto: string): Promise<string[]> {
  try {
    console.log(`Obteniendo tipos para el proyecto: ${nombreProyecto}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('tipo')
      .eq('proyecto', nombreProyecto)
      .not('tipo', 'is', null)
      .order('tipo');

    if (error) {
      console.error(`Error al obtener tipos para proyecto ${nombreProyecto}:`, error);
      return [];
    }

    // Extraer tipos únicos
    const tiposSet = new Set(
      data
        .map(item => item.tipo)
        .filter(Boolean)
    );

    const tipos = Array.from(tiposSet);
    console.log(`Se encontraron ${tipos.length} tipos para proyecto ${nombreProyecto}`);
    return tipos;
  } catch (error) {
    console.error(`Error inesperado al obtener tipos para proyecto ${nombreProyecto}:`, error);
    return [];
  }
}

/**
 * Obtener todos los sectores disponibles para un proyecto, etapa y tipo específicos
 */
export async function getSectoresPorProyectoEtapaYTipo(nombreProyecto: string, etapa: string, tipo: string): Promise<string[]> {
  try {
    console.log(`Obteniendo sectores para proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}`);

    // Si la etapa es "Ninguna", buscar sin filtrar por etapa
    let query = supabase
      .from('tablas')
      .select('sectorid')
      .eq('proyecto', nombreProyecto)
      .eq('tipo', tipo)
      .not('sectorid', 'is', null);

    // Solo filtrar por etapa si no es "Ninguna"
    if (etapa !== 'Ninguna') {
      query = query.eq('etapa', etapa);
    }

    const { data, error } = await query.order('sectorid');

    if (error) {
      console.error(`Error al obtener sectores para proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}:`, error);
      return [];
    }

    // Extraer sectores únicos
    const sectoresSet = new Set(
      data
        .map(item => item.sectorid)
        .filter(Boolean)
    );

    const sectores = Array.from(sectoresSet);
    console.log(`Se encontraron ${sectores.length} sectores para proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}`);
    return sectores;
  } catch (error) {
    console.error(`Error inesperado al obtener sectores para proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}:`, error);
    return [];
  }
}

/**
 * Obtener todos los sectores disponibles para un proyecto y tipo específicos
 */
export async function getSectoresPorProyectoYTipo(nombreProyecto: string, tipo: string): Promise<string[]> {
  try {
    console.log(`Obteniendo sectores para proyecto ${nombreProyecto} y tipo ${tipo}`);

    const { data, error } = await supabase
      .from('tablas')
      .select('sectorid')
      .eq('proyecto', nombreProyecto)
      .eq('tipo', tipo)
      .not('sectorid', 'is', null)
      .order('sectorid');

    if (error) {
      console.error(`Error al obtener sectores para proyecto ${nombreProyecto} y tipo ${tipo}:`, error);
      return [];
    }

    // Extraer sectores únicos
    const sectoresSet = new Set(
      data
        .map(item => item.sectorid)
        .filter(Boolean)
    );

    const sectores = Array.from(sectoresSet);
    console.log(`Se encontraron ${sectores.length} sectores para proyecto ${nombreProyecto} y tipo ${tipo}`);
    return sectores;
  } catch (error) {
    console.error(`Error inesperado al obtener sectores para proyecto ${nombreProyecto} y tipo ${tipo}:`, error);
    return [];
  }
}

/**
 * Obtener todos los sectores disponibles de un proyecto
 */
export async function getSectoresProyecto(nombreProyecto: string): Promise<string[]> {
  try {
    console.log(`Obteniendo sectores del proyecto: ${nombreProyecto}`);

    // Primero obtener una muestra de datos para ver la estructura
    const { data: sampleData, error: sampleError } = await supabase
      .from('tablas')
      .select('*')
      .limit(5);

    console.log('Muestra de datos para analizar estructura:', sampleData);

    if (sampleError || !sampleData || sampleData.length === 0) {
      console.error('Error al obtener muestra de datos:', sampleError);
      return ['Sector A', 'Sector B', 'Sector C', 'Sector D', 'Sector E'];
    }

    // Verificar qué campos existen en los datos
    const camposDisponibles = Object.keys(sampleData[0]);
    console.log('Campos disponibles:', camposDisponibles);

    // Determinar qué campo contiene el nombre del proyecto
    let campoProyecto = 'proyecto';
    if (!camposDisponibles.includes(campoProyecto)) {
      const alternativas = ['Proyecto', 'PROYECTO', 'proyecto_nombre', 'natdelproyecto'];
      campoProyecto = alternativas.find(campo => camposDisponibles.includes(campo)) || 'proyecto';
    }

    // Determinar qué campo contiene el sector
    let campoSector = 'sectorid';
    if (!camposDisponibles.includes(campoSector)) {
      const alternativas = ['sector', 'Sector', 'SECTOR', 'edificiotorre', 'Torre', 'Bloque'];
      campoSector = alternativas.find(campo => camposDisponibles.includes(campo)) || 'sectorid';
    }

    console.log(`Usando campo proyecto: ${campoProyecto}, campo sector: ${campoSector}`);

    // Intentar con diferentes variantes del nombre del proyecto
    const variantes = [
      nombreProyecto,
      nombreProyecto.toLowerCase(),
      nombreProyecto.toUpperCase(),
      nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1).toLowerCase()
    ];

    let sectoresData = null;

    // Intentar con cada variante del nombre
    for (const variante of variantes) {
      console.log(`Intentando con variante: ${variante}`);

      // Construir la consulta dinámicamente
      let query = supabase.from('tablas').select(campoSector);

      // Si el campo proyecto existe, filtrar por él
      if (camposDisponibles.includes(campoProyecto)) {
        query = query.eq(campoProyecto, variante);
      }

      // Ejecutar la consulta
      const { data, error } = await query.not(campoSector, 'is', null);

      if (error) {
        console.error(`Error al consultar sectores con variante ${variante}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`Encontrados ${data.length} registros con variante: ${variante}`);
        sectoresData = data;
        break;
      }
    }

    // Si no se encontraron datos con las variantes, intentar una consulta general
    if (!sectoresData) {
      console.log('Intentando consulta general sin filtro de proyecto...');
      const { data, error } = await supabase
        .from('tablas')
        .select(campoSector)
        .not(campoSector, 'is', null);

      if (error) {
        console.error('Error en consulta general:', error);
      } else {
        sectoresData = data;
        console.log(`Encontrados ${data.length} registros en consulta general`);
      }
    }

    // Si aún no hay datos, devolver sectores de prueba
    if (!sectoresData || sectoresData.length === 0) {
      console.warn(`No se encontraron sectores para el proyecto ${nombreProyecto}, devolviendo datos de prueba`);
      return ['Sector A', 'Sector B', 'Sector C', 'Sector D', 'Sector E'];
    }

    // Extraer sectores únicos y convertirlos a string
    const sectores: string[] = Array.from(new Set(
      sectoresData
        .map(item => item[campoSector])
        .filter((sector): sector is string | number => sector !== null && sector !== undefined)
        .map(sector => String(sector)) // Convertir a string para asegurar compatibilidad
    ));

    // Ordenar los sectores alfanuméricamente
    sectores.sort((a, b) => {
      // Extraer números para ordenar correctamente (E1-001, E1-002, etc.)
      const numA = a.match(/\d+/g)?.join('') || a;
      const numB = b.match(/\d+/g)?.join('') || b;
      return numA.localeCompare(numB, undefined, { numeric: true });
    });

    console.log(`Sectores únicos encontrados para ${nombreProyecto}:`, sectores);
    return sectores;
  } catch (error) {
    console.error(`Error inesperado al obtener sectores de ${nombreProyecto}:`, error);
    // En caso de error, devolver datos de prueba
    return ['Sector A', 'Sector B', 'Sector C', 'Sector D', 'Sector E'];
  }
}

// Mantener la función anterior por compatibilidad
export async function getSectoresArboria() {
  return getSectoresProyecto('Arboria');
}

/**
 * Obtener unidades por etapa, tipo y sector para un proyecto específico
 */
export async function getUnidadesPorEtapaTipoYSector(nombreProyecto: string, etapa: string, tipo: string, sector: string): Promise<UnidadResumen[]> {
  try {
    console.log(`Obteniendo unidades del sector ${sector} para el proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}...`);

    // Intentar con diferentes variantes del nombre del proyecto
    const variantes = [
      nombreProyecto,
      nombreProyecto.toLowerCase(),
      nombreProyecto.toUpperCase(),
      nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1).toLowerCase()
    ];

    let unidades: UnidadTabla[] = [];

    // Intentar con cada variante del nombre
    for (const variante of variantes) {
      console.log(`Intentando con variante: ${variante}`);

      // Construir la consulta base
      let query = supabase
        .from('tablas')
        .select('*')
        .eq('proyecto', variante)
        .eq('tipo', tipo)
        .eq('sectorid', sector);

      // Solo filtrar por etapa si no es "Ninguna"
      if (etapa !== 'Ninguna') {
        query = query.eq('etapa', etapa);
      }

      const { data, error } = await query.order('id');

      if (error) {
        console.error(`Error al consultar unidades con variante ${variante}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`Encontradas ${data.length} unidades con variante: ${variante}`);
        unidades = data;
        break;
      }
    }

    // Si no hay datos, devolver array vacío
    if (unidades.length === 0) {
      console.warn(`No se encontraron unidades para el sector ${sector} del proyecto ${nombreProyecto}, etapa ${etapa} y tipo ${tipo}`);
      return [];
    }

    // Convertir a formato resumido
    const unidadesResumen = unidades.map(unidad => formatearUnidadResumen(unidad));

    console.log(`Unidades encontradas para el sector ${sector}:`, unidadesResumen.length);
    return unidadesResumen;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades del sector ${sector}:`, error);
    return [];
  }
}

/**
 * Obtener unidades por tipo y sector para un proyecto específico
 */
export async function getUnidadesPorTipoYSector(nombreProyecto: string, tipo: string, sector: string): Promise<UnidadResumen[]> {
  try {
    console.log(`Obteniendo unidades del sector ${sector} para el proyecto ${nombreProyecto} y tipo ${tipo}...`);

    // Intentar con diferentes variantes del nombre del proyecto
    const variantes = [
      nombreProyecto,
      nombreProyecto.toLowerCase(),
      nombreProyecto.toUpperCase(),
      nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1).toLowerCase()
    ];

    let unidades: UnidadTabla[] = [];

    // Intentar con cada variante del nombre
    for (const variante of variantes) {
      console.log(`Intentando con variante: ${variante}`);
      const { data, error } = await supabase
        .from('tablas')
        .select('*')
        .eq('proyecto', variante)
        .eq('tipo', tipo)
        .eq('sectorid', sector)
        .order('id');

      if (error) {
        console.error(`Error al consultar unidades con variante ${variante}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`Encontradas ${data.length} unidades con variante: ${variante}`);
        unidades = data;
        break;
      }
    }

    // Si no hay datos, devolver array vacío
    if (unidades.length === 0) {
      console.warn(`No se encontraron unidades para el sector ${sector} del proyecto ${nombreProyecto} y tipo ${tipo}`);
      return [];
    }

    // Convertir a formato resumido
    const unidadesResumen = unidades.map(unidad => formatearUnidadResumen(unidad));

    console.log(`Unidades encontradas para el sector ${sector}:`, unidadesResumen.length);
    return unidadesResumen;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades del sector ${sector}:`, error);
    return [];
  }
}

/**
 * Obtener unidades por sector para un proyecto específico
 */
export async function getUnidadesPorSector(nombreProyecto: string, sector: string): Promise<UnidadResumen[]> {
  try {
    console.log(`Obteniendo unidades del sector ${sector} para el proyecto ${nombreProyecto}...`);

    // Intentar con diferentes variantes del nombre del proyecto
    const variantes = [
      nombreProyecto,
      nombreProyecto.toLowerCase(),
      nombreProyecto.toUpperCase(),
      nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1).toLowerCase()
    ];

    let unidades: UnidadMapaVentas[] = [];

    // Intentar con cada variante del nombre
    for (const variante of variantes) {
      console.log(`Intentando con variante: ${variante}`);
      const { data, error } = await supabase
        .from('tablas')
        .select('*')
        .eq('proyecto', variante)
        .eq('sectorid', sector)
        .order('id');

      if (error) {
        console.error(`Error al consultar unidades con variante ${variante}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`Encontradas ${data.length} unidades con variante: ${variante}`);
        unidades = data;
        break;
      }
    }

    // Si no hay datos, devolver array vacío
    if (unidades.length === 0) {
      console.warn(`No se encontraron unidades para el sector ${sector} del proyecto ${nombreProyecto}`);
      return [];
    }

    // Convertir a formato resumido
    const unidadesResumen = unidades.map(unidad => formatearUnidadResumen(unidad));

    console.log(`Unidades encontradas para el sector ${sector}:`, unidadesResumen.length);
    return unidadesResumen;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades del sector ${sector}:`, error);
    return [];
  }
}

/**
 * Mantener la función anterior por compatibilidad
 */
export async function getUnidadesArboriaPorSector(sector: string): Promise<UnidadResumen[]> {
  return getUnidadesPorSector('Arboria', sector);
}

/**
 * Obtener una unidad específica por ID y proyecto
 */
export async function getUnidadMapaVentasById(id: number, nombreProyecto?: string): Promise<UnidadMapaVentas | null> {
  try {
    console.log(`Obteniendo unidad con ID ${id}${nombreProyecto ? ` del proyecto ${nombreProyecto}` : ''}...`);

    let query = supabase
      .from('tablas')
      .select('*')
      .eq('id', id);

    // Si se proporciona el nombre del proyecto, filtrar por él también
    if (nombreProyecto) {
      // Intentar con diferentes variantes del nombre del proyecto
      const variantes = [
        nombreProyecto,
        nombreProyecto.toLowerCase(),
        nombreProyecto.toUpperCase(),
        nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1).toLowerCase()
      ];

      // Crear condición OR para las variantes del nombre
      query = query.or(`proyecto.eq.${variantes.join(',proyecto.eq.')}`);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error(`Error al obtener unidad con ID ${id}:`, error);
      return null;
    }

    return data as UnidadMapaVentas;
  } catch (error) {
    console.error(`Error inesperado al obtener unidad con ID ${id}:`, error);
    return null;
  }
}

/**
 * Mantener la función anterior por compatibilidad
 */
export async function getUnidadArboriaById(id: number): Promise<UnidadMapaVentas | null> {
  return getUnidadMapaVentasById(id, 'Arboria');
}
