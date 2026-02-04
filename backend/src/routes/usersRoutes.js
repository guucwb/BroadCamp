const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/users - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(users);
  } catch (err) {
    console.error('[USERS LIST ERROR]', err);
    return res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /api/users - Criar novo usuário
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        role: role || 'user',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('[USER CREATED]', { email: user.email, role: user.role });

    return res.status(201).json(user);
  } catch (err) {
    console.error('[USER CREATE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PATCH /api/users/:id - Atualizar usuário
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;

    const updateData = {};

    if (email) updateData.email = email.toLowerCase();
    if (name !== undefined) updateData.name = name || null;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('[USER UPDATED]', { id: user.id, email: user.email });

    return res.json(user);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    console.error('[USER UPDATE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id - Deletar usuário
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    console.log('[USER DELETED]', { id });

    return res.json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    console.error('[USER DELETE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

module.exports = router;
