// Script para criar usuário admin inicial
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Credenciais do admin
    const email = process.env.ADMIN_EMAIL || 'admin@broadcamp.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = 'Administrador';

    // Verificar se já existe
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('✅ Usuário admin já existe:', email);
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
      },
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
  } catch (err) {
    console.error('❌ Erro ao criar usuário admin:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
