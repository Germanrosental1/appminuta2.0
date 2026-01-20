
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('👑 Asignando roles de Super Admin...\n');

    const targetEmail = 'test_admin@ejemplo.com'; // Based on DB dump
    const roleName = 'superadminmv';

    // 1. Get User
    const user = await prisma.profiles.findFirst({
        where: { Email: targetEmail }
    });

    if (!user) {
        console.error(`❌ Usuario no encontrado: ${targetEmail}`);
        return;
    }
    console.log(`✅ Usuario encontrado: ${user.Email} (${user.Id})`);

    // 2. Get Role
    const role = await prisma.roles.findFirst({
        where: { Nombre: roleName }
    });

    if (!role) {
        console.error(`❌ Rol no encontrado: ${roleName}`);
        return;
    }
    console.log(`✅ Rol encontrado: ${role.Nombre} (${role.Id})`);

    // 3. Assign Role (Global in usuariosRoles)
    const existingAssignment = await prisma.usuariosRoles.findFirst({
        where: {
            IdUsuario: user.Id,
            IdRol: role.Id
        }
    });

    if (!existingAssignment) {
        await prisma.usuariosRoles.create({
            data: {
                IdUsuario: user.Id,
                IdRol: role.Id
            }
        });
        console.log(`🎉 Rol ${roleName} asignado correctamente a ${targetEmail}`);
    } else {
        console.log(`ℹ️  El usuario ya tiene el rol ${roleName}`);
    }

    // BONUS: Check permissions for this user now
    const userRoles = await prisma.usuariosRoles.findMany({
        where: { IdUsuario: user.Id },
        include: { Roles: { include: { RolesPermisos: { include: { Permisos: true } } } } }
    });

    console.log('\n🔍 Permisos actuales del usuario:');
    userRoles.forEach(ur => {
        console.log(`\nRol: ${ur.Roles.Nombre}`);
        ur.Roles.RolesPermisos.forEach(rp => {
            console.log(` - ${rp.Permisos.Nombre}`);
        });
    });

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
