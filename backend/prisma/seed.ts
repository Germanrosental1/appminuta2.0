import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // Limpiar datos existentes (opcional - comentar si no quieres limpiar)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.roles_permisos.deleteMany({});
    await prisma.usuarios_roles.deleteMany({});
    await prisma.usuarios_proyectos.deleteMany({});
    await prisma.permisos_extras.deleteMany({});
    await prisma.permisos.deleteMany({});
    await prisma.roles.deleteMany({});
    console.log('✅ Datos limpiados\n');

    // Crear permisos
    console.log('📝 Creando permisos...');
    const permisos = await Promise.all([
        prisma.permisos.create({
            data: {
                nombre: 'generarMinuta',
                descripcion: 'Permite generar nuevas minutas',
            },
        }),
        prisma.permisos.create({
            data: {
                nombre: 'editarMinuta',
                descripcion: 'Permite editar minutas existentes',
            },
        }),
        prisma.permisos.create({
            data: {
                nombre: 'aprobarRechazarMinuta',
                descripcion: 'Permite aprobar o rechazar minutas',
            },
        }),
        prisma.permisos.create({
            data: {
                nombre: 'firmarMinuta',
                descripcion: 'Permite firmar minutas',
            },
        }),
    ]);

    console.log(`✅ ${permisos.length} permisos creados:`);
    permisos.forEach((p) => console.log(`   - ${p.nombre}`));
    console.log('');

    // Crear roles
    console.log('👥 Creando roles...');
    const roles = await Promise.all([
        prisma.roles.create({
            data: { nombre: 'comercial' },
        }),
        prisma.roles.create({
            data: { nombre: 'administrador' },
        }),
        prisma.roles.create({
            data: { nombre: 'firmante' },
        }),
        prisma.roles.create({
            data: { nombre: 'viewer' },
        }),
    ]);

    console.log(`✅ ${roles.length} roles creados:`);
    roles.forEach((r) => console.log(`   - ${r.nombre}`));
    console.log('');

    // Mapear roles y permisos por nombre para fácil acceso
    const rolesMap = Object.fromEntries(roles.map((r) => [r.nombre, r]));
    const permisosMap = Object.fromEntries(permisos.map((p) => [p.nombre, p]));

    // Asignar permisos a roles
    console.log('🔗 Asignando permisos a roles...');

    // Comercial: generarMinuta, editarMinuta
    await prisma.roles_permisos.createMany({
        data: [
            {
                idrol: rolesMap['comercial'].id,
                idpermiso: permisosMap['generarMinuta'].id,
            },
            {
                idrol: rolesMap['comercial'].id,
                idpermiso: permisosMap['editarMinuta'].id,
            },
        ],
    });
    console.log('   ✅ comercial → generarMinuta, editarMinuta');

    // Administrador: editarMinuta, aprobarRechazarMinuta
    await prisma.roles_permisos.createMany({
        data: [
            {
                idrol: rolesMap['administrador'].id,
                idpermiso: permisosMap['editarMinuta'].id,
            },
            {
                idrol: rolesMap['administrador'].id,
                idpermiso: permisosMap['aprobarRechazarMinuta'].id,
            },
        ],
    });
    console.log('   ✅ administrador → editarMinuta, aprobarRechazarMinuta');

    // Firmante: firmarMinuta
    await prisma.roles_permisos.create({
        data: {
            idrol: rolesMap['firmante'].id,
            idpermiso: permisosMap['firmarMinuta'].id,
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
