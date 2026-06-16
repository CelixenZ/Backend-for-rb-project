const express = require('express');
const prisma = require('../lib/prisma');
const { protect, requireModulePermission } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const router = express.Router();

router.get('/', protect, requireModulePermission('suppliers', 'canRead'), asyncHandler(async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    include: { createdBy: { select: { fullName: true, username: true } } }
  });

  return res.json(suppliers);
}));

router.post('/', protect, requireModulePermission('suppliers', 'canCreate'), asyncHandler(async (req, res) => {
  const {
    nameEn,
    nameKh,
    taxId,
    addressEn,
    addressKh,
    contactName,
    phone,
    email,
    status,
    notes
  } = req.body;

  if (!nameEn || !contactName) {
    throw new ApiError(400, 'Supplier name and contact name are required.');
  }

  const supplier = await prisma.supplier.create({
    data: {
      nameEn,
      nameKh: nameKh || null,
      taxId: taxId || null,
      addressEn: addressEn || null,
      addressKh: addressKh || null,
      contactName,
      phone: phone || null,
      email: email || null,
      status: status === undefined ? true : Boolean(status),
      notes: notes || null,
      createdBy: { connect: { id: req.user.id } }
    }
  });

  return res.status(201).json({ message: 'Supplier created successfully.', supplier });
}));

router.put('/:id', protect, requireModulePermission('suppliers', 'canWrite'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const supplier = await prisma.supplier.findUnique({ where: { id } });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  if (req.user.role === 'STAFF' && supplier.userId !== req.user.id) {
    throw new ApiError(403, 'Forbidden. You can only update your own supplier records.');
  }

  const updateData = {
    nameEn: req.body.nameEn ?? supplier.nameEn,
    nameKh: req.body.nameKh !== undefined ? req.body.nameKh : supplier.nameKh,
    taxId: req.body.taxId !== undefined ? req.body.taxId : supplier.taxId,
    addressEn: req.body.addressEn !== undefined ? req.body.addressEn : supplier.addressEn,
    addressKh: req.body.addressKh !== undefined ? req.body.addressKh : supplier.addressKh,
    contactName: req.body.contactName ?? supplier.contactName,
    phone: req.body.phone !== undefined ? req.body.phone : supplier.phone,
    email: req.body.email !== undefined ? req.body.email : supplier.email,
    status: req.body.status !== undefined ? Boolean(req.body.status) : supplier.status,
    notes: req.body.notes !== undefined ? req.body.notes : supplier.notes
  };

  const updatedSupplier = await prisma.supplier.update({ where: { id }, data: updateData });

  return res.json({ message: 'Supplier updated successfully.', supplier: updatedSupplier });
}));

router.delete('/:id', protect, requireModulePermission('suppliers', 'canDelete'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const supplier = await prisma.supplier.findUnique({ where: { id } });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found.');
  }

  if (req.user.role === 'STAFF' && supplier.userId !== req.user.id) {
    throw new ApiError(403, 'Forbidden. You can only delete your own supplier records.');
  }

  await prisma.supplier.delete({ where: { id } });

  return res.json({ message: 'Supplier deleted successfully.' });
}));

module.exports = router;
