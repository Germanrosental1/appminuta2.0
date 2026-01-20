import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Iniciando reparación de roles y permisos...\n');

    // 1. Definir Permisos Requeridos
    const requiredPermissions = [
        { Nombre: 'generarMinuta', Descripcion: 'Permite generar nuevas minutas' },
        { Nombre: 'editarMinuta', Descripcion: 'Permite editar minutas existentes' },
        { Nombre: 'aprobarRechazarMinuta', Descripcion: 'Permite aprobar o rechazar minutas' },
        { Nombre: 'firmarMinuta', Descripcion: 'Permite firmar minutas' },
        { Nombre: 'verMinuta', Descripcion: 'Permite ver minutas' },
    ];

    console.log('📝 Verificando/Creando permisos...');
    for (const perm of requiredPermissions) {
        // Find existing permission by name
        const existing = await prisma.permisos.findFirst({
            where: { Nombre: perm.Nombre }
        });

        if (!existing) {
            await prisma.permisos.create({
                data: perm
            });
            console.log(`   + Creado permiso: ${perm.Nombre}`);
        } else {
            console.log(`   ✓ Existe permiso: ${perm.Nombre}`);
        }
    }

    // 2. Definir Roles y sus Permisos
    const rolesConfig = [
        {
            Nombre: 'superadminmv',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'firmarMinuta', 'verMinuta']
        },
        {
            Nombre: 'adminmv',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'verMinuta']
        },
        {
            Nombre: 'comercial',
            permisos: ['generarMinuta', 'editarMinuta', 'verMinuta']
        },
        {
            Nombre: 'firmante',
            permisos: ['firmarMinuta', 'verMinuta']
        },
        {
            Nombre: 'administrador',
            permisos: ['generarMinuta', 'editarMinuta', 'aprobarRechazarMinuta', 'verMinuta']
        }
    ];

    console.log('\n👥 Verificando/Creando roles y asignando permisos...');

    for (const roleConfig of rolesConfig) {
        // Find or Create Role
        let role = await prisma.roles.findFirst({ where: { Nombre: roleConfig.Nombre } });
        if (!role) {
            role = await prisma.roles.create({ data: { Nombre: roleConfig.Nombre } });
            console.log(`   + Creado rol: ${roleConfig.Nombre}`);
        } else {
            console.log(`   ✓ Existe rol: ${roleConfig.Nombre}`);
        }

        // Assign Permissions
        for (const permName of roleConfig.permisos) {
            const permiso = await prisma.permisos.findFirst({ where: { Nombre: permName } });
            if (permiso && role) {
                // Check if link exists
                const existingLink = await prisma.rolesPermisos.findFirst({
                    where: {
                        IdRol: role.Id,
                        IdPermiso: permiso.Id
                    }
                });

                if (!existingLink) {
                    await prisma.rolesPermisos.create({
                        data: {
                            IdRol: role.Id,
                            IdPermiso: permiso.Id
                        }
                    });
                    console.log(`     -> Asignado ${permName} a ${roleConfig.Nombre}`);
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
