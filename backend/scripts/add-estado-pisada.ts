import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando script para agregar estado "Pisada"...');

    const existing = await prisma.estadocomercial.findUnique({
        where: { nombreestado: 'Pisada' },
    });

    if (existing) {
        console.log('⚠️ El estado "Pisada" ya existe:', existing);
    } else {
        const nuevo = await prisma.estadocomercial.create({
            data: {
                nombreestado: 'Pisada',
            },
        });
        console.log('✅ Estado "Pisada" creado exitosamente:', nuevo);
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
