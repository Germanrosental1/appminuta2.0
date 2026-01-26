
const { PrismaClient } = require('@prisma/client-uif');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.UIF_DATABASE_URL,
            },
        },
    });

    try {
        console.log('Connecting to UIF DB...');
        const clients = await prisma.clients.findMany();
        console.log(`Found ${clients.length} clients in UIF DB.`);
        console.log(JSON.stringify(clients, null, 2));
    } catch (e) {
        console.error('Error connecting to UIF DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
