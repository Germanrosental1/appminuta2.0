import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Iniciando reparación de roles y permisos...\n');

    // 1. Definir Permisos Requeridos
    const requiredPermissions = [
        { nombre: 'generarMinuta', descripcion: 'Permite generar nuevas minutas' },
        { nombre: 'editarMinuta', descripcion: 'Permite editar minutas existentes' },
        { nombre: 'aprobarRechazarMinuta', descripcion: 'Permite aprobar o rechazar minutas' },
        { nombre: 'firmarMinuta', descripcion: 'Permite firmar minutas' },
        { nombre: 'verMinuta', descripcion: 'Permite ver minutas' },
    ];

    console.log('📝 Verificando/Creando permisos...');
    for (const perm of requiredPermissions) {
        // Find existing permission by name
        const existing = await prisma.permisos.findFirst({
            where: { nombre: perm.nombre }
        });

        if (!existing) {
            await prisma.permisos.create({
                data: perm
            });
            console.log(`   + Creado permiso: ${perm.nombre}`);
        } else {
            console.log(`   ✓ Existe permiso: ${perm.nombre}`);
        }
    }

    // 2. Definir Roles y sus Permisos
    const rolesConfig = [
        {
            nombre: 'superadminmv',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'firmarMinuta', 'verMinuta']
        },
        {
            nombre: 'adminmv',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'verMinuta']
        },
        {
            nombre: 'comercial',
            permisos: ['generarMinuta', 'editarMinuta', 'verMinuta']
        },
        {
            nombre: 'firmante',
            permisos: ['firmarMinuta', 'verMinuta']
        },
        {
            nombre: 'administrador',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'verMinuta']
        }
    ];

    console.log('\n👥 Verificando/Creando roles y asignando permisos...');

    for (const roleConfig of rolesConfig) {
        // Find or Create Role
        let role = await prisma.roles.findFirst({ where: { nombre: roleConfig.nombre } });
        if (!role) {
            role = await prisma.roles.create({ data: { nombre: roleConfig.nombre } });
            console.log(`   + Creado rol: ${roleConfig.nombre}`);
        } else {
            console.log(`   ✓ Existe rol: ${roleConfig.nombre}`);
        }

        // Assign Permissions
        for (const permName of roleConfig.permisos) {
            const permiso = await prisma.permisos.findFirst({ where: { nombre: permName } });
            if (permiso && role) {
                // Check if link exists
                const existingLink = await prisma.roles_permisos.findFirst({
                    where: {
                        idrol: role.id,
                        idpermiso: permiso.id
                    }
                });

                if (!existingLink) {
                    await prisma.roles_permisos.create({
                        data: {
                            idrol: role.id,
                            idpermiso: permiso.id
                        }
                    });
                    console.log(`     -> Asignado ${permName} a ${roleConfig.nombre}`);
                }
            }
        }
    }

    console.log('\n✨ Reparación completada.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
