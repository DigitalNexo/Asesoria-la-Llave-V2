const API_URL = 'http://localhost:5001/api';

async function testLogin() {
  console.log('🧪 Probando login con credenciales del .env...\n');

  try {
    // Intentar login
    console.log('📝 Intentando login con:');
    console.log('   Usuario: CarlosAdmin');
    console.log('   Password: Turleque2026$\n');

    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CarlosAdmin',
        password: 'Turleque2026$',
      }),
    });

    if (!loginRes.ok) {
      const error = await loginRes.json();
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }

    const loginData = await loginRes.json();
    console.log('✅ Login exitoso!');
    console.log(`   Usuario ID: ${loginData.user.id}`);
    console.log(`   Token: ${loginData.token.substring(0, 50)}...\n`);

    const token = loginData.token;

    // Probar acceso a un endpoint protegido
    console.log('🔐 Probando acceso a endpoint protegido (/api/roles)...\n');

    const rolesRes = await fetch(`${API_URL}/roles`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!rolesRes.ok) {
      const error = await rolesRes.json();
      throw new Error(`Failed to fetch roles: ${JSON.stringify(error)}`);
    }

    const rolesData = await rolesRes.json();
    console.log(`✅ Acceso exitoso a /api/roles`);
    console.log(`   Roles encontrados: ${rolesData.length}`);
    rolesData.forEach((role: any) => {
      console.log(`   - ${role.name} (${role.id})`);
    });

    console.log('\n🎉 ¡Sistema funcionando correctamente!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
