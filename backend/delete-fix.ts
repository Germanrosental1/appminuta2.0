
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteProject(projectId: string) {
    console.log(`Deleting project ${projectId}...`);
    try {
        await prisma.$transaction(async (tx) => {
            // Edificios
            const edificios = await tx.edificios.findMany({ where: { proyecto_id: projectId } });
            const edificioIds = edificios.map(e => e.id);

            // Unidades
            const unidades = await tx.unidades.findMany({ where: { edificio_id: { in: edificioIds } } });
            const unidadIds = unidades.map(u => u.id);

            // Details
            await tx.detallesventa.deleteMany({ where: { unidad_id: { in: unidadIds } } });
            await tx.unidadesmetricas.deleteMany({ where: { unidad_id: { in: unidadIds } } });

            // Units & Buildings
            await tx.unidades.deleteMany({ where: { id: { in: unidadIds } } });
            await tx.edificios.deleteMany({ where: { id: { in: edificioIds } } });

            // Project
            await tx.proyectos.delete({ where: { id: projectId } });
        });
        console.log('Deleted successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteProject('7a916e8e-5332-48fb-b33a-92928760310f');
