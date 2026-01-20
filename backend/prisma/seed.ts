import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // Limpiar datos existentes (opcional - comentar si no quieres limpiar)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.rolesPermisos.deleteMany({});
    await prisma.usuariosRoles.deleteMany({});
    await prisma.usuariosProyectos.deleteMany({});
    await prisma.permisosExtras.deleteMany({});
    await prisma.permisos.deleteMany({});
    await prisma.roles.deleteMany({});
    console.log('✅ Datos limpiados\n');

    // Crear permisos
    console.log('📝 Creando permisos...');
    const permisos = await Promise.all([
        prisma.permisos.create({
            data: {
                Nombre: 'generarMinuta',
                Descripcion: 'Permite generar nuevas minutas',
            },
        }),
        prisma.permisos.create({
            data: {
                Nombre: 'editarMinuta',
                Descripcion: 'Permite editar minutas existentes',
            },
        }),
        prisma.permisos.create({
            data: {
                Nombre: 'aprobarRechazarMinuta',
                Descripcion: 'Permite aprobar o rechazar minutas',
            },
        }),
        prisma.permisos.create({
            data: {
                Nombre: 'firmarMinuta',
                Descripcion: 'Permite firmar minutas',
            },
        }),
    ]);

    console.log(`✅ ${permisos.length} permisos creados:`);
    permisos.forEach((p) => console.log(`   - ${p.Nombre}`));
    console.log('');

    // Crear roles
    console.log('👥 Creando roles...');
    const roles = await Promise.all([
        prisma.roles.create({
            data: { Nombre: 'comercial' },
        }),
        prisma.roles.create({
            data: { Nombre: 'administrador' },
        }),
        prisma.roles.create({
            data: { Nombre: 'firmante' },
        }),
        prisma.roles.create({
            data: { Nombre: 'viewer' },
        }),
    ]);

    console.log(`✅ ${roles.length} roles creados:`);
    roles.forEach((r) => console.log(`   - ${r.Nombre}`));
    console.log('');

    // Mapear roles y permisos por nombre para fácil acceso
    const rolesMap = Object.fromEntries(roles.map((r) => [r.Nombre, r]));
    const permisosMap = Object.fromEntries(permisos.map((p) => [p.Nombre, p]));

    // Asignar permisos a roles
    console.log('🔗 Asignando permisos a roles...');

    // Comercial: generarMinuta, editarMinuta
    await prisma.rolesPermisos.createMany({
        data: [
            {
                IdRol: rolesMap['comercial'].Id,
                IdPermiso: permisosMap['generarMinuta'].Id,
            },
            {
                IdRol: rolesMap['comercial'].Id,
                IdPermiso: permisosMap['editarMinuta'].Id,
            },
        ],
    });
    console.log('   ✅ comercial → generarMinuta, editarMinuta');

    // Administrador: editarMinuta, aprobarRechazarMinuta
    await prisma.rolesPermisos.createMany({
        data: [
            {
                IdRol: rolesMap['administrador'].Id,
                IdPermiso: permisosMap['editarMinuta'].Id,
            },
            {
                IdRol: rolesMap['administrador'].Id,
                IdPermiso: permisosMap['aprobarRechazarMinuta'].Id,
            },
        ],
    });
    console.log('   ✅ administrador → editarMinuta, aprobarRechazarMinuta');

    // Firmante: firmarMinuta
    await prisma.rolesPermisos.create({
        data: {
            IdRol: rolesMap['firmante'].Id,
            IdPermiso: permisosMap['firmarMinuta'].Id,
        },
    });
    console.log('   ✅ firmante → firmarMinuta');

    // Viewer: sin permisos (solo puede ver minutas, que es el comportamiento por defecto)
    console.log('   ✅ viewer → (sin permisos específicos)');
    console.log('');

    // Resumen final
    console.log('📊 Resumen de la estructura:');
    console.log('');
    console.log('Roles y sus permisos:');
    console.log('  • comercial:');
    console.log('    - generarMinuta');
    console.log('    - editarMinuta');
    console.log('  • administrador:');
    console.log('    - editarMinuta');
    console.log('    - aprobarRechazarMinuta');
    console.log('  • firmante:');
    console.log('    - firmarMinuta');
    console.log('  • viewer:');
    console.log('    - (sin permisos - solo lectura)');
    console.log('');
    console.log('ℹ️  Nota: Todos los roles pueden ver minutas por defecto.');
    console.log('');
    console.log('✨ Seed completado exitosamente!');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
