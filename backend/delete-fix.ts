
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteProject(projectId: string) {
    console.log(`Deleting project ${projectId}...`);
    try {
        await prisma.$transaction(async (tx) => {
            // Edificios
            const edificios = await tx.edificios.findMany({ where: { ProyectoId: projectId } });
            const edificioIds = edificios.map(e => e.Id);

            // Unidades
            const unidades = await tx.unidades.findMany({ where: { EdificioId: { in: edificioIds } } });
            const unidadIds = unidades.map(u => u.Id);

            // Details
            await tx.detallesVenta.deleteMany({ where: { UnidadId: { in: unidadIds } } });
            await tx.unidadesMetricas.deleteMany({ where: { UnidadId: { in: unidadIds } } });

            // Units & Buildings
            await tx.unidades.deleteMany({ where: { Id: { in: unidadIds } } });
            await tx.edificios.deleteMany({ where: { Id: { in: edificioIds } } });

            // Project
            await tx.proyectos.delete({ where: { Id: projectId } });
        });
        console.log('Deleted successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteProject('7a916e8e-5332-48fb-b33a-92928760310f');
