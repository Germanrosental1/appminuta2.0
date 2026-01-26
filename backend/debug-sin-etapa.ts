import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Starting verification script for "Sin Etapa"...');
    const nombreProyecto = 'Arboria';

    const proyecto = await prisma.proyectos.findFirst({
        where: { Nombre: { equals: nombreProyecto, mode: 'insensitive' } },
        select: { Id: true },
    });

    if (!proyecto) {
        console.error('Project not found');
        return;
    }

    console.log(`\n1. Testing getEtapas for ${nombreProyecto}...`);
    // Simulate getEtapas logic
    const resultEtapas = await prisma.unidades.findMany({
        where: {
            Edificios: { ProyectoId: proyecto.Id },
        },
        select: {
            EtapaId: true,
            Etapas: { select: { Nombre: true } },
        },
        distinct: ['EtapaId'],
        orderBy: { Etapas: { Nombre: 'asc' } },
    });

    const etapas = resultEtapas.map((r) => r.Etapas?.Nombre || 'Sin Etapa').filter(Boolean);
    const uniqueEtapas = [...new Set(etapas)];
    console.log('Etapas found:', uniqueEtapas);

    const sinEtapaExists = uniqueEtapas.includes('Sin Etapa');
    console.log('Contains "Sin Etapa"?', sinEtapaExists);

    if (sinEtapaExists) {
        console.log(`\n2. Testing getTipos for ${nombreProyecto} with "Sin Etapa"...`);
        // Simulate getTipos with 'Sin Etapa'
        const resultTipos = await prisma.unidades.findMany({
            where: {
                Edificios: { ProyectoId: proyecto.Id },
                EtapaId: null // This is what 'Sin Etapa' maps to
            },
            select: {
                TiposUnidad: { select: { Nombre: true } },
            },
            distinct: ['TipoUnidadId'],
            orderBy: { TiposUnidad: { Nombre: 'asc' } },
        });

        const tipos = resultTipos.map((r) => r.TiposUnidad.Nombre).filter(Boolean);
        console.log('Tipos found for "Sin Etapa":', tipos);

        console.log('Contains "Cochera Descubierta"?', tipos.includes('Cochera Descubierta'));

        if (tipos.includes('Cochera Descubierta')) {
            console.log(`\n3. Testing getSectores for ${nombreProyecto}, "Sin Etapa", "Cochera Descubierta"...`);
            // Simulate getSectores
            const resultSectores = await prisma.unidades.findMany({
                where: {
                    Edificios: { ProyectoId: proyecto.Id },
                    EtapaId: null,
                    TiposUnidad: { Nombre: 'Cochera Descubierta' }
                },
                select: { SectorId: true },
                distinct: ['SectorId'],
                orderBy: { SectorId: 'asc' },
            });

            const sectores = resultSectores.map(r => r.SectorId).filter(s => s != null && s !== '');
            console.log('Sectores found:', sectores);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
