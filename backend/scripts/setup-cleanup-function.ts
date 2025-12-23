import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting database function setup...');

    try {
        // Drop function if exists to ensure clean update
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS cleanup_old_logs;`);
        console.log('✅ Previous function dropped (if existed).');

        // Create the function
        await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION cleanup_old_logs()
      RETURNS void AS $$
      BEGIN
        -- Delete High Impact logs older than 365 days
        DELETE FROM "changes_logs" 
        WHERE "impacto" = 'Alto' AND "created_at" < NOW() - INTERVAL '365 days';

        -- Delete Medium Impact logs older than 90 days
        DELETE FROM "changes_logs" 
        WHERE "impacto" = 'Medio' AND "created_at" < NOW() - INTERVAL '90 days';

        -- Delete Low/Other Impact logs older than 30 days
        DELETE FROM "changes_logs" 
        WHERE ("impacto" = 'Bajo' OR "impacto" IS NULL) AND "created_at" < NOW() - INTERVAL '30 days';
      END;
      $$ LANGUAGE plpgsql;
    `);

        console.log('✅ Function "cleanup_old_logs" created successfully!');

        // Optional: Log advice for scheduling
        console.log('ℹ️  To schedule this function, enable pg_cron extensions in Supabase and run:');
        console.log("   SELECT cron.schedule('0 0 * * *', 'SELECT cleanup_old_logs()');");

    } catch (error) {
        console.error('❌ Error creating function:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
