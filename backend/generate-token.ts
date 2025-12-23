
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';

// Cargar variables de entorno
if (fs.existsSync('.env')) {
    dotenv.config();
}

const secret = process.env.SUPABASE_JWT_SECRET;

if (!secret) {
    console.error('Error: SUPABASE_JWT_SECRET no está definido en el archivo .env o variables de entorno.');
    process.exit(1);
}

const payload = {
    sub: 'agent-n8n-id', // ID ficticio para el agente
    email: 'agent@n8n.com',
    role: 'authenticated', // Rol necesario para pasar el guard
    // Puedes agregar más claims si es necesario
};

const token = jwt.sign(payload, secret, {
    expiresIn: '100y', // "Infinito" (100 años)
    algorithm: 'HS256'
});

console.log('\n✅ Token Generado Exitosamente:');
console.log('================================================================');
console.log(token);
console.log('================================================================');
console.log('\nCopia este token y úsalo en el Header "Authorization" de n8n con el prefijo "Bearer ".');
