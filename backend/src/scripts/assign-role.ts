
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('👑 Asignando roles de Super Admin...\n');

    const targetEmail = 'test_admin@ejemplo.com'; // Based on DB dump
    const roleName = 'superadminmv';

    // 1. Get User
    const user = await prisma.profiles.findFirst({
        where: { email: targetEmail }
    });

    if (!user) {
        console.error(`❌ Usuario no encontrado: ${targetEmail}`);
        return;
    }
    console.log(`✅ Usuario encontrado: ${user.email} (${user.id})`);

    // 2. Get Role
    const role = await prisma.roles.findFirst({
        where: { nombre: roleName }
    });

    if (!role) {
        console.error(`❌ Rol no encontrado: ${roleName}`);
        return;
    }
    console.log(`✅ Rol encontrado: ${role.nombre} (${role.id})`);

    // 3. Assign Role (Global in usuarios_roles)
    const existingAssignment = await prisma.usuarios_roles.findFirst({
        where: {
            idusuario: user.id,
            idrol: role.id
        }
    });

    if (!existingAssignment) {
        await prisma.usuarios_roles.create({
            data: {
                idusuario: user.id,
                idrol: role.id
            }
        });
        console.log(`🎉 Rol ${roleName} asignado correctamente a ${targetEmail}`);
    } else {
        console.log(`ℹ️  El usuario ya tiene el rol ${roleName}`);
    }

    // BONUS: Check permissions for this user now
    const userRoles = await prisma.usuarios_roles.findMany({
        where: { idusuario: user.id },
        include: { roles: { include: { roles_permisos: { include: { permisos: true } } } } }
    });

    console.log('\n🔍 Permisos actuales del usuario:');
    userRoles.forEach(ur => {
        console.log(`\nRol: ${ur.roles.nombre}`);
        ur.roles.roles_permisos.forEach(rp => {
            console.log(` - ${rp.permisos.nombre}`);
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
