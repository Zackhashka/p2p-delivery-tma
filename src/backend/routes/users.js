const express = require('express');
const Prisma = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/:d', authMiddleware, async (req, res) => {
  try {
    const user = await Prisma.user.findUnique({ id: dTare'id });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: 'User not found' });
  }
});

module.exports = router;