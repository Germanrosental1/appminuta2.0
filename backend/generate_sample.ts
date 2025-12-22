import * as XLSX from 'xlsx';
import * as path from 'path';

const data = [
    {
        "proyecto": "Proyecto Demo API",
        "edificio": "Torre API",
        "nrounidad": "1001",
        "piso": "10",
        "etapa": "Lanzamiento",
        "tipo": "Departamento",
        "estado": "Disponible",
        "m2exclusivos": 75,
        "preciousd": 150000,
        "frente": "Norte",
        "manzana": "A",
        "fechaposesionporboletocompraventa": "01/12/2026",
        // Add some fields that might be optional
        "comercial": "Juan Perez",
        "patioterraza": "Balcon",
        "m2patioterraza": 12
    },
    {
        "proyecto": "Proyecto Demo API",
        "edificio": "Torre API",
        "nrounidad": "1002",
        "piso": "10",
        "tipo": "Departamento",
        "estado": "Reservado",
        "m2exclusivos": 80,
        "preciousd": 160000
    }
];

const sheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Unidades");

const outputPath = path.join(__dirname, 'sample_unidades.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`Created sample file at: ${outputPath}`);
