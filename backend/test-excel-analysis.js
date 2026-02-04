const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/tmp/test_import_unidades.xlsx';
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer', raw: false });

console.log('====== ANÁLISIS COMPLETO DEL EXCEL ======\n');
console.log('📑 Hojas disponibles:', workbook.SheetNames);

// Analizar TODAS las hojas
workbook.SheetNames.forEach((sheetName, sheetIdx) => {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 HOJA ' + (sheetIdx + 1) + ': "' + sheetName + '"');
    console.log('═'.repeat(80));

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    console.log('📝 Total de filas:', data.length);

    if (data.length === 0) {
        console.log('   ⚠️ Hoja vacía');
        return;
    }

    const columns = Object.keys(data[0]);
    console.log('\n📋 COLUMNAS (' + columns.length + '):');
    columns.forEach((col, i) => console.log('   ' + (i + 1) + '. "' + col + '"'));

    const fieldAliases = {
        'edificio/torre': 'edificiotorre',
        'edificiotorre': 'edificiotorre',
        'sector': 'edificiotorre',
        'numerounidad': 'numerounidad',
        'nºcochera': 'numerounidad',
        'ncochera': 'numerounidad',
        'm2cubiertos': 'm2cubierto',
        'm2cubierto': 'm2cubierto',
        'm2semicubiertos': 'm2semicubierto',
        'm2semicubierto': 'm2semicubierto',
        'm2calculo': 'm2calculo',
        'clientetitularboleto': 'clientetitular',
        'clientetitular': 'clientetitular',
        'dptocomprador': 'deptartamentocomprador',
        'deptartamentocomprador': 'deptartamentocomprador',
        'tipopatioterraza': 'tipopatio',
        'tipopatio': 'tipopatio',
        'preciousd': 'preciousd',
        'precio': 'preciousd',
        'usdm2': 'usdm2',
        'preciom2': 'preciom2'
    };

    function normalizeKey(key) {
        return key.toLowerCase()
            .replace(/\s+/g, '')
            .replaceAll(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n');
    }

    const normalizedCols = columns.map(c => fieldAliases[normalizeKey(c)] || normalizeKey(c));

    console.log('\n🔄 MAPEO DE COLUMNAS:');
    columns.forEach((col, i) => {
        console.log('   "' + col + '" → "' + normalizedCols[i] + '"');
    });

    console.log('\n✅ CAMPOS OBLIGATORIOS:');
    console.log('   ' + (normalizedCols.includes('proyecto') ? '✓' : '✗') + ' proyecto');
    console.log('   ' + (normalizedCols.includes('preciom2') ? '✓' : '✗') + ' preciom2');

    console.log('\n📌 CAMPOS IMPORTANTES:');
    ['proyecto', 'edificiotorre', 'numerounidad', 'piso', 'tipo', 'estado', 'preciom2', 'preciousd', 'etapa', 'dormitorios', 'm2cubierto', 'm2semicubierto', 'm2calculo'].forEach(f => {
        console.log('   ' + (normalizedCols.includes(f) ? '✓' : '○') + ' ' + f);
    });

    console.log('\n📄 PRIMERAS 3 FILAS:');
    data.slice(0, 3).forEach((row, idx) => {
        console.log('\n🔹 Fila ' + (idx + 2) + ':');
        Object.entries(row).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                const val = String(v);
                console.log('   ' + k + ': ' + val.substring(0, 50) + (val.length > 50 ? '...' : ''));
            }
        });
    });

    let emptyPrecioM2 = 0;
    let emptyProyecto = 0;
    const proyectos = new Set();
    const edificios = new Set();
    const estados = new Set();
    const tipos = new Set();

    data.forEach((row) => {
        const nr = {};
        Object.keys(row).forEach(k => {
            const nk = normalizeKey(k);
            nr[fieldAliases[nk] || nk] = row[k];
        });

        if (!nr.preciom2 || String(nr.preciom2).trim() === '') emptyPrecioM2++;
        if (!nr.proyecto || String(nr.proyecto).trim() === '') emptyProyecto++;
        if (nr.proyecto) proyectos.add(nr.proyecto);
        if (nr.edificiotorre) edificios.add(nr.edificiotorre);
        if (nr.estado) estados.add(nr.estado);
        if (nr.tipo) tipos.add(nr.tipo);
    });

    console.log('\n\n⚠️  VALIDACIÓN:');
    console.log('   Filas sin PrecioM2: ' + emptyPrecioM2 + '/' + data.length + (emptyPrecioM2 > 0 ? ' ❌' : ' ✅'));
    console.log('   Filas sin Proyecto: ' + emptyProyecto + '/' + data.length + (emptyProyecto > 0 ? ' ❌' : ' ✅'));

    if (proyectos.size > 0) {
        console.log('\n🏗️  PROYECTOS (' + proyectos.size + '): ' + [...proyectos].join(', '));
    }
    if (edificios.size > 0) {
        console.log('🏢 EDIFICIOS (' + edificios.size + '): ' + [...edificios].slice(0, 5).join(', ') + (edificios.size > 5 ? '...' : ''));
    }
    if (estados.size > 0) {
        console.log('📊 ESTADOS (' + estados.size + '): ' + [...estados].join(', '));
    }
    if (tipos.size > 0) {
        console.log('🏠 TIPOS (' + tipos.size + '): ' + [...tipos].join(', '));
    }

    console.log('\n📈 RESUMEN HOJA "' + sheetName + '":');
    console.log('   Total: ' + data.length + ' | Válidas: ~' + (data.length - Math.max(emptyPrecioM2, emptyProyecto)) + ' | Errores: ~' + Math.max(emptyPrecioM2, emptyProyecto));
});

console.log('\n\n' + '═'.repeat(80));
console.log('====== FIN DEL ANÁLISIS ======');
console.log('═'.repeat(80));
