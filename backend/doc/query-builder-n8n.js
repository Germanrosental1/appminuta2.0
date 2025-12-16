// =====================================================
// QUERY BUILDER PARA N8N - VERSION COMPATIBLE
// Copia este código en un nodo "Code" de N8N
// =====================================================

// Obtener los datos de entrada
var inputData = $input.all()[0].json;
var params = inputData.output || inputData;

var filtros = params.filtros || {};
var comparativo = params.comparativo || {};
var filtroLimite = params.filtro_limite;

// Límite con protección máxima de 100
var limit = Math.min(parseInt(filtroLimite, 10) || 10, 100);

// Set para trackear tablas necesarias
var tablasRequeridas = { unidades: true };

// Mapeo de campos
var fieldMapping = {
    id: { col: "u.id", tabla: null },
    sectorid: { col: "u.sectorid", tabla: null },
    manzana: { col: "u.manzana", tabla: null },
    piso: { col: "u.piso", tabla: null },
    nrounidad: { col: "u.nrounidad", tabla: null },
    dormitorios: { col: "u.dormitorios", tabla: null },
    frente: { col: "u.frente", tabla: null },
    destino: { col: "u.destino", tabla: null },
    obs: { col: "u.obs", tabla: null },
    tamano: { col: "u.tamano", tabla: null },
    proyecto: { col: "p.nombre", tabla: "proyectos" },
    natdelproyecto: { col: "p.naturaleza", tabla: "proyectos" },
    edificiotorre: { col: "e.nombreedificio", tabla: "edificios" },
    etapa: { col: "et.nombre", tabla: "etapas" },
    tipo: { col: "t.nombre", tabla: "tiposunidad" },
    preciousd: { col: "dv.preciousd", tabla: "detallesventa" },
    usdm2: { col: "dv.usdm2", tabla: "detallesventa" },
    fechareserva: { col: "dv.fechareserva", tabla: "detallesventa" },
    estado: { col: "ec.nombreestado", tabla: "estadocomercial" },
    motivonodisp: { col: "mn.nombre", tabla: "motivosnodisp" },
    comercial: { col: "c.nombre", tabla: "comerciales" },
    m2cubiertos: { col: "um.m2cubiertos", tabla: "unidadesmetricas" },
    m2totales: { col: "um.m2totales", tabla: "unidadesmetricas" },
    m2exclusivos: { col: "um.m2exclusivos", tabla: "unidadesmetricas" },
    tipocochera: { col: "tc.nombre", tabla: "tiposcochera" }
};

// Dependencias de tablas
var tablaDependencias = {
    proyectos: ["edificios"],
    estadocomercial: ["detallesventa"],
    motivosnodisp: ["detallesventa"],
    comerciales: ["detallesventa"]
};

// Operadores
var operatorMapping = {
    "=": "=",
    "==": "=",
    "igual": "=",
    ">": ">",
    "mayor": ">",
    ">=": ">=",
    "mayoroigual": ">=",
    "<": "<",
    "menor": "<",
    "<=": "<=",
    "menoroigual": "<=",
    "!=": "!=",
    "diferente": "!=",
    "like": "ILIKE",
    "contiene": "ILIKE",
    "empieza": "ILIKE",
    "termina": "ILIKE"
};

// Campos de texto
var textFields = ["proyecto", "etapa", "tipo", "estado", "edificiotorre", "comercial"];

// PASO 1: Detectar tablas necesarias
var camposUsados = [];

for (var campo in filtros) {
    var config = filtros[campo];
    if (config && config.valor && config.valor !== "") {
        camposUsados.push(campo);
        var info = fieldMapping[campo];
        if (info && info.tabla) {
            tablasRequeridas[info.tabla] = true;
            var deps = tablaDependencias[info.tabla];
            if (deps) {
                for (var i = 0; i < deps.length; i++) {
                    tablasRequeridas[deps[i]] = true;
                }
            }
        }
    }
}

// Analizar comparativo
if (comparativo && comparativo.campo) {
    var infoComp = fieldMapping[comparativo.campo];
    if (infoComp && infoComp.tabla) {
        tablasRequeridas[infoComp.tabla] = true;
        var depsComp = tablaDependencias[infoComp.tabla];
        if (depsComp) {
            for (var j = 0; j < depsComp.length; j++) {
                tablasRequeridas[depsComp[j]] = true;
            }
        }
    }
}

// PASO 2: Construir SELECT
var selectFields = [
    "u.id",
    "u.sectorid",
    "u.nrounidad",
    "u.dormitorios",
    "u.piso"
];

// Agregar campos útiles si tablas incluidas
if (tablasRequeridas.edificios) selectFields.push("e.nombreedificio AS edificio");
if (tablasRequeridas.proyectos) selectFields.push("p.nombre AS proyecto");
if (tablasRequeridas.etapas) selectFields.push("et.nombre AS etapa");
if (tablasRequeridas.tiposunidad) selectFields.push("t.nombre AS tipo");
if (tablasRequeridas.estadocomercial) selectFields.push("ec.nombreestado AS estado");
if (tablasRequeridas.detallesventa) {
    selectFields.push("dv.preciousd AS precio_usd");
    selectFields.push("dv.usdm2 AS precio_m2");
}
if (tablasRequeridas.unidadesmetricas) selectFields.push("um.m2totales AS metros_totales");

// PASO 3: Construir JOINs
var query = "SELECT " + selectFields.join(", ") + "\nFROM unidades u\n";

var joins = [
    { nombre: "edificios", sql: "LEFT JOIN edificios e ON u.edificio_id = e.id" },
    { nombre: "proyectos", sql: "LEFT JOIN proyectos p ON e.proyecto_id = p.id" },
    { nombre: "etapas", sql: "LEFT JOIN etapas et ON u.etapa_id = et.id" },
    { nombre: "tiposunidad", sql: "LEFT JOIN tiposunidad t ON u.tipounidad_id = t.id" },
    { nombre: "detallesventa", sql: "LEFT JOIN detallesventa dv ON dv.unidad_id = u.id" },
    { nombre: "estadocomercial", sql: "LEFT JOIN estadocomercial ec ON dv.estado_id = ec.id" },
    { nombre: "unidadesmetricas", sql: "LEFT JOIN unidadesmetricas um ON um.unidad_id = u.id" },
    { nombre: "tiposcochera", sql: "LEFT JOIN tiposcochera tc ON u.tipocochera_id = tc.id" },
    { nombre: "motivosnodisp", sql: "LEFT JOIN motivosnodisp mn ON dv.motivonodisp_id = mn.id" },
    { nombre: "comerciales", sql: "LEFT JOIN comerciales c ON dv.comercial_id = c.id" }
];

for (var k = 0; k < joins.length; k++) {
    if (tablasRequeridas[joins[k].nombre]) {
        query += joins[k].sql + "\n";
    }
}

// PASO 4: Construir WHERE
var whereConditions = [];
var values = [];
var paramIndex = 1;

for (var campoW in filtros) {
    var configW = filtros[campoW];
    if (!configW || !configW.valor || configW.valor === "") {
        continue;
    }

    var infoW = fieldMapping[campoW];
    if (!infoW) {
        continue;
    }

    var operadorInput = (configW.operador || "=").toLowerCase();
    var operator = operatorMapping[operadorInput] || "=";
    var value = configW.valor;

    // Manejo de patrones LIKE
    if (operadorInput === "contiene") {
        value = "%" + value + "%";
    } else if (operadorInput === "empieza") {
        value = value + "%";
    } else if (operadorInput === "termina") {
        value = "%" + value;
    }

    // Construir condición
    var isTextField = textFields.indexOf(campoW) !== -1;
    if (isTextField && operator === "=") {
        whereConditions.push("LOWER(" + infoW.col + ") = LOWER($" + paramIndex + ")");
    } else {
        whereConditions.push(infoW.col + " " + operator + " $" + paramIndex);
    }

    values.push(value);
    paramIndex++;
}

if (whereConditions.length > 0) {
    query += "WHERE " + whereConditions.join("\n  AND ") + "\n";
}

// PASO 5: ORDER BY
if (comparativo && comparativo.campo && comparativo.orden) {
    var orderInfo = fieldMapping[comparativo.campo];
    var orderColumn = orderInfo ? orderInfo.col : "u.id";
    var orderDirection = comparativo.orden.toUpperCase() === "DESC" ? "DESC" : "ASC";
    query += "ORDER BY " + orderColumn + " " + orderDirection + "\n";
} else {
    query += "ORDER BY u.id ASC\n";
}

// PASO 6: LIMIT
query += "LIMIT " + limit;

// Retornar resultado para N8N
return {
    json: {
        query: query,
        values: values,
        limit: limit,
        tablasUsadas: Object.keys(tablasRequeridas)
    }
};
