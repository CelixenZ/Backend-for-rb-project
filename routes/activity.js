const express = require('express');
const prisma = require('../lib/prisma');
const { protect, requireModulePermission } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const router = express.Router();

router.get('/', protect, requireModulePermission('activities', 'canRead'), asyncHandler(async (req, res) => {
  const logs = await prisma.activity.findMany({
    include: {
      contract: { select: { contractNumber: true } },
      user: { select: { id: true, fullName: true, username: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return res.json(logs);
}));

router.post('/', protect, requireModulePermission('activities', 'canCreate'), asyncHandler(async (req, res) => {
  const { contractId, actionType, content, fileUrl } = req.body;

  if (!contractId || !actionType) {
    throw new ApiError(400, 'Contract ID and action type are required for activity logs.');
  }

  const contract = await prisma.contract.findUnique({ where: { id: Number(contractId) } });

  if (!contract) {
    throw new ApiError(404, 'Contract not found.');
  }

  const activity = await prisma.activity.create({
    data: {
      contract: { connect: { id: Number(contractId) } },
      user: { connect: { id: req.user.id } },
      userName: req.user.fullName || req.user.username,
      actionType,
      content: content || null,
      fileUrl: fileUrl || null
    }
  });

  return res.status(201).json({ message: 'Activity recorded successfully.', activity });
}));

module.exports = router;
