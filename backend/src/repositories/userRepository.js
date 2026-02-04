const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class UserRepository {
  /**
   * Find all users
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of users
   */
  async findAll(filters = {}) {
    try {
      const where = {};
      if (filters.role) where.role = filters.role;

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
          // Never return password
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.debug('Users fetched', { count: users.length });
      return users;
    } catch (error) {
      logger.error('UserRepository.findAll failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User or null
   */
  async findById(id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (user) {
        logger.debug('User found', { id, email: user.email });
      } else {
        logger.warn('User not found', { id });
      }

      return user;
    } catch (error) {
      logger.error('UserRepository.findById failed', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {boolean} includePassword - Include password hash
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmail(email, includePassword = false) {
    try {
      const select = {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      };

      if (includePassword) {
        select.password = true;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select
      });

      if (user) {
        logger.debug('User found by email', { email });
      } else {
        logger.warn('User not found by email', { email });
      }

      return user;
    } catch (error) {
      logger.error('UserRepository.findByEmail failed', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   */
  async create(data) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name || null,
          role: data.role || 'user'
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info('User created', {
        id: user.id,
        email: user.email,
        role: user.role
      });

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        logger.warn('User creation failed - email already exists', {
          email: data.email
        });
        throw new Error('Email already exists');
      }

      logger.error('UserRepository.create failed', {
        error: error.message,
        email: data.email
      });
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated user
   */
  async update(id, data) {
    try {
      const updateData = {};

      if (data.email !== undefined) updateData.email = data.email;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.role !== undefined) updateData.role = data.role;

      // Hash password if updating
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      updateData.updatedAt = new Date();

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info('User updated', {
        id,
        fields: Object.keys(updateData)
      });

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('User not found for update', { id });
        throw new Error('User not found');
      }

      if (error.code === 'P2002') {
        logger.warn('User update failed - email already exists', {
          id,
          email: data.email
        });
        throw new Error('Email already exists');
      }

      logger.error('UserRepository.update failed', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<Object>} Result
   */
  async delete(id) {
    try {
      await prisma.user.delete({
        where: { id }
      });

      logger.info('User deleted', { id });

      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn('User not found for deletion', { id });
        throw new Error('User not found');
      }

      logger.error('UserRepository.delete failed', {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User if password is correct, null otherwise
   */
  async verifyPassword(email, password) {
    try {
      const user = await this.findByEmail(email, true);

      if (!user) {
        logger.warn('Login attempt for non-existent user', { email });
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (isValid) {
        logger.info('Password verified successfully', { email });

        // Remove password from returned object
        delete user.password;
        return user;
      } else {
        logger.warn('Invalid password attempt', { email });
        return null;
      }
    } catch (error) {
      logger.error('UserRepository.verifyPassword failed', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  /**
   * Count users
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Count
   */
  async count(filters = {}) {
    try {
      const where = {};
      if (filters.role) where.role = filters.role;

      return await prisma.user.count({ where });
    } catch (error) {
      logger.error('UserRepository.count failed', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new UserRepository();
