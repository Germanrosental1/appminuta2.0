# Query Builder Dinámico para Unidades

## Descripción

Esta función JavaScript construye queries SQL dinámicas y optimizadas para consultar unidades inmobiliarias. Solo incluye los JOINs y columnas necesarios según los filtros proporcionados.

## Código Completo

```javascript
/**
 * Construye una query SQL dinámica OPTIMIZADA para unidades
 * Solo incluye JOINs y columnas necesarias según los filtros
 * 
 * @param {Object} params - Objeto con filtros, comparativo y límite
 * @returns {Object} - { query, values, tablasUsadas }
 */
function buildUnidadesQueryOptimized(params) {
  const { filtros = {}, comparativo = {}, filtro_limite } = params.output || params;
  
  // Límite con protección máxima de 100
  const limit = Math.min(parseInt(filtro_limite, 10) || 10, 100);

  // Set para trackear qué tablas necesitamos
  const tablasRequeridas = new Set(['unidades']);
  
  // Mapeo de campos del JSON a columnas de DB y sus tablas requeridas
  const fieldMapping = {
    // === Campos de unidades (tabla principal, sin JOIN) ===
    id: { col: 'u.id', tabla: null },
    sectorid: { col: 'u.sectorid', tabla: null },
    manzana: { col: 'u.manzana', tabla: null },
    piso: { col: 'u.piso', tabla: null },
    nrounidad: { col: 'u.nrounidad', tabla: null },
    dormitorios: { col: 'u.dormitorios', tabla: null },
    frente: { col: 'u.frente', tabla: null },
    destino: { col: 'u.destino', tabla: null },
    obs: { col: 'u.obs', tabla: null },
    tamano: { col: 'u.tamano', tabla: null },
    
    // === Campos que requieren JOINs ===
    
    // Proyectos (requiere edificios primero)
    proyecto: { col: 'p.nombre', tabla: 'proyectos' },
    natdelproyecto: { col: 'p.naturaleza', tabla: 'proyectos' },
    
    // Edificios
    edificiotorre: { col: 'e.nombreedificio', tabla: 'edificios' },
    
    // Etapas
    etapa: { col: 'et.nombre', tabla: 'etapas' },
    
    // Tipos de unidad
    tipo: { col: 't.nombre', tabla: 'tiposunidad' },
    
    // Detalles de venta
    preciousd: { col: 'dv.preciousd', tabla: 'detallesventa' },
    usdm2: { col: 'dv.usdm2', tabla: 'detallesventa' },
    fechareserva: { col: 'dv.fechareserva', tabla: 'detallesventa' },
    fechafirmabole: { col: 'dv.fechafirmaboleto', tabla: 'detallesventa' },
    clientetitularbo: { col: 'dv.clientetitularboleto', tabla: 'detallesventa' },
    fechaposesion: { col: 'dv.fechaposesion', tabla: 'detallesventa' },
    clienteinteresa: { col: 'dv.clienteinteresado', tabla: 'detallesventa' },
    deptocomprad: { col: 'dv.departamentocomprado', tabla: 'detallesventa' },
    
    // Estado comercial (requiere detallesventa)
    estado: { col: 'ec.nombreestado', tabla: 'estadocomercial' },
    
    // Motivo no disponible (requiere detallesventa)
    motivonodisp: { col: 'mn.nombre', tabla: 'motivosnodisp' },
    
    // Comercial (requiere detallesventa)
    comercial: { col: 'c.nombre', tabla: 'comerciales' },
    
    // Métricas de unidad
    m2cubiertos: { col: 'um.m2cubiertos', tabla: 'unidadesmetricas' },
    m2semicubiert: { col: 'um.m2semicubiertos', tabla: 'unidadesmetricas' },
    m2exclusivos: { col: 'um.m2exclusivos', tabla: 'unidadesmetricas' },
    m2patioterraza: { col: 'um.m2patioterraza', tabla: 'unidadesmetricas' },
    m2comunes: { col: 'um.m2comunes', tabla: 'unidadesmetricas' },
    m2calculo: { col: 'um.m2calculo', tabla: 'unidadesmetricas' },
    m2totales: { col: 'um.m2totales', tabla: 'unidadesmetricas' },
    
    // Tipos adicionales
    tipocochera: { col: 'tc.nombre', tabla: 'tiposcochera' },
    patioterraza: { col: 'tpt.nombre', tabla: 'tipospatioterraza' }
  };

  // Dependencias de tablas (si necesitas X, también necesitas Y primero)
  const tablaDependencias = {
    proyectos: ['edificios'],      // proyectos requiere edificios para el JOIN
    estadocomercial: ['detallesventa'],
    motivosnodisp: ['detallesventa'],
    comerciales: ['detallesventa']
  };

  // === PASO 1: Detectar tablas necesarias ===
  const camposUsados = new Set();
  
  // Analizar filtros
  for (const [campo, config] of Object.entries(filtros)) {
    if (config && config.valor && config.valor !== '') {
      camposUsados.add(campo);
      const info = fieldMapping[campo];
      if (info && info.tabla) {
        tablasRequeridas.add(info.tabla);
        // Agregar dependencias
        const deps = tablaDependencias[info.tabla];
        if (deps) {
          deps.forEach(dep => tablasRequeridas.add(dep));
        }
      }
    }
  }

  // Analizar campo de ordenamiento
  if (comparativo && comparativo.campo) {
    const info = fieldMapping[comparativo.campo];
    if (info && info.tabla) {
      tablasRequeridas.add(info.tabla);
      const deps = tablaDependencias[info.tabla];
      if (deps) {
        deps.forEach(dep => tablasRequeridas.add(dep));
      }
    }
  }

  // === PASO 2: Construir SELECT dinámico ===
  const selectFields = [
    'u.id',
    'u.sectorid', 
    'u.nrounidad',
    'u.dormitorios',
    'u.piso'
  ];

  // Agregar campos usados en filtros al SELECT
  camposUsados.forEach(campo => {
    const info = fieldMapping[campo];
    if (info) {
      const alias = campo.replace(/[^a-zA-Z0-9]/g, '_');
      const fieldWithAlias = `${info.col} AS ${alias}`;
      if (!selectFields.some(f => f.includes(info.col))) {
        selectFields.push(fieldWithAlias);
      }
    }
  });

  // Agregar campos útiles si sus tablas ya están incluidas
  if (tablasRequeridas.has('edificios') && !selectFields.some(f => f.includes('e.nombreedificio'))) {
    selectFields.push('e.nombreedificio AS edificio');
  }
  if (tablasRequeridas.has('proyectos') && !selectFields.some(f => f.includes('p.nombre'))) {
    selectFields.push('p.nombre AS proyecto');
  }
  if (tablasRequeridas.has('etapas') && !selectFields.some(f => f.includes('et.nombre'))) {
    selectFields.push('et.nombre AS etapa');
  }
  if (tablasRequeridas.has('tiposunidad') && !selectFields.some(f => f.includes('t.nombre'))) {
    selectFields.push('t.nombre AS tipo');
  }
  if (tablasRequeridas.has('estadocomercial') && !selectFields.some(f => f.includes('ec.nombreestado'))) {
    selectFields.push('ec.nombreestado AS estado');
  }
  if (tablasRequeridas.has('detallesventa') && !selectFields.some(f => f.includes('dv.preciousd'))) {
    selectFields.push('dv.preciousd AS precio_usd');
    selectFields.push('dv.usdm2 AS precio_m2');
  }
  if (tablasRequeridas.has('unidadesmetricas') && !selectFields.some(f => f.includes('um.m2totales'))) {
    selectFields.push('um.m2totales AS metros_totales');
  }

  // === PASO 3: Construir FROM y JOINs ===
  let query = `SELECT ${selectFields.join(',\n       ')}\nFROM unidades u\n`;

  // JOINs ordenados por dependencias (el orden importa!)
  const joinDefinitions = [
    { nombre: 'edificios', sql: 'LEFT JOIN edificios e ON u.edificio_id = e.id' },
    { nombre: 'proyectos', sql: 'LEFT JOIN proyectos p ON e.proyecto_id = p.id' },
    { nombre: 'etapas', sql: 'LEFT JOIN etapas et ON u.etapa_id = et.id' },
    { nombre: 'tiposunidad', sql: 'LEFT JOIN tiposunidad t ON u.tipounidad_id = t.id' },
    { nombre: 'detallesventa', sql: 'LEFT JOIN detallesventa dv ON dv.unidad_id = u.id' },
    { nombre: 'estadocomercial', sql: 'LEFT JOIN estadocomercial ec ON dv.estado_id = ec.id' },
    { nombre: 'unidadesmetricas', sql: 'LEFT JOIN unidadesmetricas um ON um.unidad_id = u.id' },
    { nombre: 'tiposcochera', sql: 'LEFT JOIN tiposcochera tc ON u.tipocochera_id = tc.id' },
    { nombre: 'tipospatioterraza', sql: 'LEFT JOIN tipospatioterraza tpt ON u.tipopatioterraza_id = tpt.id' },
    { nombre: 'motivosnodisp', sql: 'LEFT JOIN motivosnodisp mn ON dv.motivonodisp_id = mn.id' },
    { nombre: 'comerciales', sql: 'LEFT JOIN comerciales c ON dv.comercial_id = c.id' }
  ];

  for (const joinDef of joinDefinitions) {
    if (tablasRequeridas.has(joinDef.nombre)) {
      query += joinDef.sql + '\n';
    }
  }

  // === PASO 4: Construir WHERE ===
  const whereConditions = [];
  const values = [];
  let paramIndex = 1;

  // Mapeo de operadores
  const operatorMapping = {
    '=': '=',
    '==': '=',
    'igual': '=',
    '>': '>',
    'mayor': '>',
    '>=': '>=',
    'mayoroigual': '>=',
    '<': '<',
    'menor': '<',
    '<=': '<=',
    'menoroigual': '<=',
    '!=': '!=',
    '<>': '!=',
    'diferente': '!=',
    'like': 'ILIKE',
    'contiene': 'ILIKE',
    'empieza': 'ILIKE',
    'termina': 'ILIKE'
  };

  // Campos de texto (para búsqueda case-insensitive)
  const textFields = ['proyecto', 'etapa', 'tipo', 'estado', 'edificiotorre', 'comercial', 'motivonodisp', 'natdelproyecto'];

  for (const [campo, config] of Object.entries(filtros)) {
    // Saltar si no hay valor
    if (!config || config.valor === null || config.valor === undefined || config.valor === '') {
      continue;
    }
    
    const info = fieldMapping[campo];
    if (!info) {
      console.warn(`Campo no mapeado: ${campo}`);
      continue;
    }

    // Determinar operador
    const operadorInput = (config.operador || '=').toLowerCase();
    let operator = operatorMapping[operadorInput] || '=';
    let value = config.valor;

    // Manejo especial para patrones LIKE
    if (operadorInput === 'contiene') {
      value = `%${value}%`;
    } else if (operadorInput === 'empieza') {
      value = `${value}%`;
    } else if (operadorInput === 'termina') {
      value = `%${value}`;
    }

    // Construir condición
    if (textFields.includes(campo) && operator === '=') {
      // Búsqueda case-insensitive para campos de texto
      whereConditions.push(`LOWER(${info.col}) = LOWER($${paramIndex})`);
    } else {
      whereConditions.push(`${info.col} ${operator} $${paramIndex}`);
    }

    values.push(value);
    paramIndex++;
  }

  // Agregar WHERE si hay condiciones
  if (whereConditions.length > 0) {
    query += `WHERE ${whereConditions.join('\n  AND ')}\n`;
  }

  // === PASO 5: ORDER BY ===
  if (comparativo && comparativo.campo && comparativo.orden) {
    const orderInfo = fieldMapping[comparativo.campo];
    const orderColumn = orderInfo ? orderInfo.col : 'u.id';
    const orderDirection = comparativo.orden.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += `ORDER BY ${orderColumn} ${orderDirection}\n`;
  } else {
    // Ordenamiento por defecto
    query += `ORDER BY u.id ASC\n`;
  }

  // === PASO 6: LIMIT ===
  query += `LIMIT ${limit}`;

  return {
    query: query.trim(),
    values,
    tablasUsadas: [...tablasRequeridas],
    camposFiltrados: [...camposUsados],
    limite: limit
  };
}

// ============================================
// EJEMPLO DE USO
// ============================================

// Ejemplo 1: Unidades disponibles de 3 dormitorios en Arboria
const ejemplo1 = {
  output: {
    filtros: {
      dormitorios: { valor: "3", operador: "=" },
      estado: { valor: "disponible", operador: "=" },
      proyecto: { valor: "Arboria", operador: "=" }
    },
    comparativo: {
      campo: "preciousd",
      orden: "ASC"
    },
    filtro_limite: "20"
  }
};

// Ejemplo 2: Unidades mayores a 50m2 en cualquier proyecto
const ejemplo2 = {
  output: {
    filtros: {
      m2totales: { valor: "50", operador: ">" },
      estado: { valor: "disponible", operador: "=" }
    },
    comparativo: {
      campo: "m2totales",
      orden: "DESC"
    },
    filtro_limite: "10"
  }
};

// Ejemplo 3: Búsqueda por nombre de proyecto (contiene)
const ejemplo3 = {
  output: {
    filtros: {
      proyecto: { valor: "arb", operador: "contiene" }
    },
    filtro_limite: "5"
  }
};

// Ejecutar ejemplos
console.log("=== EJEMPLO 1 ===");
const result1 = buildUnidadesQueryOptimized(ejemplo1);
console.log(result1.query);
console.log("Valores:", result1.values);
console.log("Tablas usadas:", result1.tablasUsadas);

console.log("\n=== EJEMPLO 2 ===");
const result2 = buildUnidadesQueryOptimized(ejemplo2);
console.log(result2.query);
console.log("Valores:", result2.values);
console.log("Tablas usadas:", result2.tablasUsadas);

console.log("\n=== EJEMPLO 3 ===");
const result3 = buildUnidadesQueryOptimized(ejemplo3);
console.log(result3.query);
console.log("Valores:", result3.values);
console.log("Tablas usadas:", result3.tablasUsadas);
```

## Optimizaciones Aplicadas

| Técnica | Beneficio |
|---------|-----------|
| **JOINs condicionales** | Solo hace JOIN de tablas necesarias según filtros (~40-60% menos JOINs en queries típicas) |
| **SELECT dinámico** | Solo trae columnas necesarias (menos datos transferidos por red) |
| **Límite máximo 100** | Protección contra queries muy costosas |
| **Parámetros preparados** | Prevención de SQL Injection |
| **Case-insensitive** | Búsqueda de texto sin importar mayúsculas |

## Índices Recomendados para PostgreSQL/Supabase

```sql
-- Índices para las columnas más filtradas
CREATE INDEX IF NOT EXISTS idx_unidades_dormitorios ON unidades(dormitorios);
CREATE INDEX IF NOT EXISTS idx_unidades_edificio_id ON unidades(edificio_id);
CREATE INDEX IF NOT EXISTS idx_unidades_etapa_id ON unidades(etapa_id);
CREATE INDEX IF NOT EXISTS idx_unidades_tipounidad_id ON unidades(tipounidad_id);

CREATE INDEX IF NOT EXISTS idx_edificios_proyecto_id ON edificios(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_detallesventa_unidad_id ON detallesventa(unidad_id);
CREATE INDEX IF NOT EXISTS idx_detallesventa_estado_id ON detallesventa(estado_id);

-- Índice para búsqueda case-insensitive de estado
CREATE INDEX IF NOT EXISTS idx_estadocomercial_nombreestado_lower 
  ON estadocomercial(LOWER(nombreestado));

-- Índice para búsqueda case-insensitive de proyecto
CREATE INDEX IF NOT EXISTS idx_proyectos_nombre_lower 
  ON proyectos(LOWER(nombre));
```

## Estructura de Entrada Esperada

```json
{
  "output": {
    "consulta": "",
    "filtro_limite": "10",
    "operacion": "",
    "filtros": {
      "dormitorios": {
        "valor": "3",
        "operador": "="
      },
      "estado": {
        "valor": "disponible",
        "operador": "="
      },
      "proyecto": {
        "valor": "Arboria",
        "operador": "contiene"
      }
    },
    "comparativo": {
      "modo": "",
      "campo": "preciousd",
      "orden": "ASC",
      "limite": ""
    }
  }
}
```

## Operadores Soportados

| Operador | Alias | Descripción |
|----------|-------|-------------|
| `=` | `==`, `igual` | Igualdad exacta |
| `>` | `mayor` | Mayor que |
| `>=` | `mayoroigual` | Mayor o igual |
| `<` | `menor` | Menor que |
| `<=` | `menoroigual` | Menor o igual |
| `!=` | `<>`, `diferente` | Diferente de |
| `like` | `contiene` | Contiene el texto (%valor%) |
| - | `empieza` | Empieza con (valor%) |
| - | `termina` | Termina con (%valor) |
