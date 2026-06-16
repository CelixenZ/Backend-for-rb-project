import { Router } from "express";
import { protect, requireModulePermission } from "../../middleware/auth.middleware";
import asyncHandler from "../../shared/utils/asyncHandler";
import prisma from "../../config/prisma";
import ApiError from "../../shared/utils/apiError";

const router = Router();

router.get('/', protect, requireModulePermission('services', 'canRead'), asyncHandler(async (req, res) => {
  const services = await prisma.service.findMany({
    include: { createdBy: { select: { fullName: true, username: true } } }
  });

  return res.json(services);
}));

router.post('/', protect, requireModulePermission('services', 'canCreate'), asyncHandler(async (req, res) => {
  const {
    name,
    description,
    unitPrice,
    unitType,
    billingCycle,
    productType,
    status
  } = req.body;

  if (!name || unitPrice === undefined) {
    throw new ApiError(400, 'Service name and unit price are required.');
  }

  const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) : Number(unitPrice);
  if (isNaN(price)) {
    throw new ApiError(400, 'Unit price must be a valid number.');
  }

  const service = await prisma.service.create({
    data: {
      name,
      description: description || null,
      unitPrice: price,
      unitType: unitType || null,
      billingCycle: billingCycle || 'ONETIME',
      productType: productType || null,
      status: status === undefined ? true : Boolean(status),
      createdBy: { connect: { id: req.user.id } }
    }
  });

  return res.status(201).json({ message: 'Service added successfully.', service });
}));

router.put('/:id', protect, requireModulePermission('services', 'canWrite'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    throw new ApiError(404, 'Service not found.');
  }

  if (req.user.role === 'STAFF' && service.userId !== req.user.id) {
    throw new ApiError(403, 'Forbidden. You can only update your own services.');
  }

  const updateData: any = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  
  if (req.body.unitPrice !== undefined) {
    const price = typeof req.body.unitPrice === 'string' ? parseFloat(req.body.unitPrice) : Number(req.body.unitPrice);
    if (isNaN(price)) {
      throw new ApiError(400, 'Unit price must be a valid number.');
    }
    updateData.unitPrice = price;
  }

  if (req.body.unitType !== undefined) updateData.unitType = req.body.unitType;
  if (req.body.billingCycle !== undefined) updateData.billingCycle = req.body.billingCycle;
  if (req.body.productType !== undefined) updateData.productType = req.body.productType;
  if (req.body.status !== undefined) updateData.status = Boolean(req.body.status);

  const updatedService = await prisma.service.update({ where: { id }, data: updateData });

  return res.json({ message: 'Service updated successfully.', service: updatedService });
}));

router.delete('/:id', protect, requireModulePermission('services', 'canDelete'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    throw new ApiError(404, 'Service not found.');
  }

  if (req.user.role === 'STAFF' && service.userId !== req.user.id) {
    throw new ApiError(403, 'Forbidden. You can only delete your own services.');
  }

  await prisma.service.delete({ where: { id } });

  return res.json({ message: 'Service removed successfully.' });
}));

export default router;
