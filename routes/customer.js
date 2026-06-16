const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { protect, requireModulePermission } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// ==========================================
// 1. GET ALL CUSTOMERS (GET /api/customers)
// ==========================================
router.get('/', protect, requireModulePermission('customers', 'canRead'), asyncHandler(async (req, res) => {
  const customers = await prisma.customer.findMany({
    include: { createdBy: { select: { fullName: true, username: true } } }
  });

  return res.json(customers);
}));

// ==========================================
// 2. CREATE A NEW CUSTOMER (POST /api/customers)
// ==========================================
router.post('/', protect, requireModulePermission('customers', 'canCreate'), asyncHandler(async (req, res) => {
  const {
    nameEn,
    nameKh,
    representative,
    phone,
    addressEn,
    addressKh,
    taxId
  } = req.body;

  if (!nameEn || !nameKh || !representative || !phone) {
    throw new ApiError(400, 'Required fields: nameEn, nameKh, representative, phone.');
  }

  const newCustomer = await prisma.customer.create({
    data: {
      nameEn,
      nameKh,
      representative,
      phone,
      addressEn: addressEn || null,
      addressKh: addressKh || null,
      taxId: taxId || null,
      createdBy: { connect: { id: req.user.id } }
    }
  });

  return res.status(201).json({
    message: 'Customer created successfully!',
    customer: newCustomer
  });
}));

// ==========================================
// 3. UPDATE A CUSTOMER (PUT /api/customers/:id)
// ==========================================
router.put('/:id', protect, requireModulePermission('customers', 'canWrite'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nameEn, nameKh, addressEn, addressKh, taxId, representative, phone } = req.body;

  // 1. Verify the customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(id) }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  // 2. Role-Based Access Check: Standard STAFF can only update their own records
  if (req.user.role === 'STAFF' && customer.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden. You do not have permission to update this customer.");
  }

  // 3. Perform the update
  const updatedCustomer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data: {
      nameEn: nameEn || customer.nameEn,
      nameKh: nameKh !== undefined ? nameKh : customer.nameKh,
      addressEn: addressEn !== undefined ? addressEn : customer.addressEn,
      addressKh: addressKh !== undefined ? addressKh : customer.addressKh,
      taxId: taxId !== undefined ? taxId : customer.taxId,
      representative: representative || customer.representative,
      phone: phone !== undefined ? phone : customer.phone
    }
  });

  return res.json({
    message: "Customer updated successfully!",
    customer: updatedCustomer
  });
}));

// ==========================================
// 4. DELETE A CUSTOMER (DELETE /api/customers/:id)
// ==========================================
router.delete('/:id', protect, requireModulePermission('customers', 'canDelete'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Verify the customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(id) }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  // 2. Staff may delete customers they own if they have the matrix delete permission
  if (req.user.role === 'STAFF' && customer.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden. You can only delete your own customer records.");
  }

  // 3. Delete from database
  await prisma.customer.delete({
    where: { id: parseInt(id) }
  });

  return res.json({ message: "Customer record permanently deleted." });
}));

module.exports = router;
