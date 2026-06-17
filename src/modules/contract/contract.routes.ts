import { Router } from "express";
import {
  protect,
  requireModulePermission,
} from "../../middleware/auth.middleware";
import asyncHandler from "../../shared/utils/asyncHandler";
import prisma from "../../config/prisma";
import ApiError from "../../shared/utils/apiError";

const router = Router();

router.get(
  "/",
  protect,
  requireModulePermission("contracts", "canRead"),
  asyncHandler(async (req, res) => {
    const {
      customerId,
      supplierId,
      status,
      type,
      startDate,
      endDate,
      partnerCategory,
    } = req.query;
    const where: any = {};

    if (customerId) {
      where.customerId = Number(customerId);
    }

    if (supplierId) {
      where.supplierId = Number(supplierId);
    }

    if (partnerCategory === "customer") {
      where.supplierId = null;
    } else if (partnerCategory === "supplier") {
      where.supplierId = { not: null };
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        customer: { select: { id: true, nameEn: true, nameKh: true } },
        supplier: { select: { id: true, nameEn: true, nameKh: true } },
        lineItems: true,
        documents: true,
        activities: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(contracts);
  }),
);

router.get(
  "/:id",
  protect,
  requireModulePermission("contracts", "canRead"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        supplier: true,
        lineItems: true,
        documents: true,
        activities: { orderBy: { createdAt: "desc" } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!contract) {
      throw new ApiError(404, "Contract not found.");
    }

    return res.json(contract);
  }),
);

router.post(
  "/",
  protect,
  requireModulePermission("contracts", "canCreate"),
  asyncHandler(async (req, res) => {
    const {
      contractNumber,
      title,
      customerId,
      supplierId,
      type,
      status,
      commitmentTerms,
      paymentTerms,
      scopeOfWork,
      startDate,
      endDate,
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      internalCost,
      projectedProfit,
      profitMargin,
      notes,
      version,
      lineItems,
      documents,
    } = req.body;

    // 1. Mandatory field validation
    if (!contractNumber || !startDate || !endDate) {
      throw new ApiError(
        400,
        "Contract number, start date and end date are required.",
      );
    }

    // 2. ID Validation
    const parsedCustomerId = customerId ? Number(customerId) : null;
    const parsedSupplierId = supplierId ? Number(supplierId) : null;

    if (!parsedCustomerId && !parsedSupplierId) {
      throw new ApiError(400, "At least one party (Customer or Supplier) must be associated with the contract.");
    }

    // 3. Date Validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid start or end date format.");
    }

    const newContract = await prisma.contract.create({
      data: {
        contractNumber,
        title: title || `Contract ${contractNumber}`,
        customer: parsedCustomerId ? { connect: { id: parsedCustomerId } } : undefined,
        supplier: parsedSupplierId ? { connect: { id: parsedSupplierId } } : undefined,
        type: type || "General",
        status: status || "DRAFT",
        commitmentTerms: commitmentTerms || null,
        paymentTerms: paymentTerms || null,
        scopeOfWork: scopeOfWork || null,
        startDate: start,
        endDate: end,
        subtotal: Number(subtotal) || 0,
        taxRate: Number(taxRate) || 0,
        taxAmount: Number(taxAmount) || 0,
        grandTotal: Number(grandTotal) || 0,
        internalCost: Number(internalCost) || 0,
        projectedProfit: Number(projectedProfit) || 0,
        profitMargin: Number(profitMargin) || 0,
        notes: notes || null,
        version: version || "1.0",
        createdBy: { connect: { id: req.user.id } },
        lineItems:
          lineItems && Array.isArray(lineItems)
            ? {
                create: lineItems.map((item) => ({
                  serviceName: item.serviceName,
                  quantity: Number(item.quantity) || 1,
                  unitPrice: Number(item.unitPrice) || 0,
                  discountType: item.discountType || "NONE",
                  discountValue: Number(item.discountValue) || 0,
                  discountAmount: Number(item.discountAmount) || 0,
                  subtotal: Number(item.subtotal) || 0,
                  internalCost: Number(item.internalCost) || 0,
                })),
              }
            : undefined,
        documents:
          documents && Array.isArray(documents)
            ? {
                create: documents.map((doc) => ({
                  uploadedBy: { connect: { id: req.user.id } },
                  name: doc.name,
                  fileUrl: doc.fileUrl,
                  fileType: doc.fileType || "application/octet-stream",
                  category: doc.category,
                  versionLabel: doc.versionLabel || null,
                  notes: doc.notes || null,
                })),
              }
            : undefined,
        activities: {
          create: {
            user: { connect: { id: req.user.id } },
            userName: req.user.fullName || req.user.username,
            actionType: "CREATED",
            content: `Contract ${contractNumber} was registered.`,
          },
        },
      },
      include: {
        customer: true,
        supplier: true,
        lineItems: true,
        documents: true,
        activities: true,
      },
    });

    return res.status(201).json({
      message: "Contract created successfully.",
      contract: newContract,
    });
  }),
);

router.put(
  "/:id",
  protect,
  requireModulePermission("contracts", "canWrite"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!contract) {
      throw new ApiError(404, "Contract not found.");
    }

    if (req.user.role === "STAFF" && contract.userId !== req.user.id) {
      throw new ApiError(
        403,
        "Forbidden. You can only update your own contracts.",
      );
    }

    const updateData: any = {
      title: req.body.title !== undefined ? req.body.title : contract.title,
      customerId:
        req.body.customerId !== undefined
          ? Number(req.body.customerId)
          : contract.customerId,
      supplierId:
        req.body.supplierId !== undefined
          ? req.body.supplierId
            ? Number(req.body.supplierId)
            : null
          : contract.supplierId,
      type: req.body.type !== undefined ? req.body.type : contract.type,
      status: req.body.status !== undefined ? req.body.status : contract.status,
      commitmentTerms:
        req.body.commitmentTerms !== undefined
          ? req.body.commitmentTerms
          : contract.commitmentTerms,
      paymentTerms:
        req.body.paymentTerms !== undefined
          ? req.body.paymentTerms
          : contract.paymentTerms,
      scopeOfWork:
        req.body.scopeOfWork !== undefined
          ? req.body.scopeOfWork
          : contract.scopeOfWork,
      startDate:
        req.body.startDate !== undefined
          ? new Date(req.body.startDate)
          : contract.startDate,
      endDate:
        req.body.endDate !== undefined
          ? new Date(req.body.endDate)
          : contract.endDate,
      subtotal:
        req.body.subtotal !== undefined ? req.body.subtotal : contract.subtotal,
      taxRate:
        req.body.taxRate !== undefined ? req.body.taxRate : contract.taxRate,
      taxAmount:
        req.body.taxAmount !== undefined
          ? req.body.taxAmount
          : contract.taxAmount,
      grandTotal:
        req.body.grandTotal !== undefined
          ? req.body.grandTotal
          : contract.grandTotal,
      internalCost:
        req.body.internalCost !== undefined
          ? req.body.internalCost
          : contract.internalCost,
      projectedProfit:
        req.body.projectedProfit !== undefined
          ? req.body.projectedProfit
          : contract.projectedProfit,
      profitMargin:
        req.body.profitMargin !== undefined
          ? req.body.profitMargin
          : contract.profitMargin,
      notes: req.body.notes !== undefined ? req.body.notes : contract.notes,
      version:
        req.body.version !== undefined ? req.body.version : contract.version,
    };

    if (Array.isArray(req.body.lineItems)) {
      await prisma.contractLineItem.deleteMany({ where: { contractId: id } });
      updateData.lineItems = {
        create: req.body.lineItems.map((item) => ({
          serviceName: item.serviceName,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          discountType: item.discountType || "NONE",
          discountValue: item.discountValue || 0,
          discountAmount: item.discountAmount || 0,
          subtotal: item.subtotal || 0,
          internalCost: item.internalCost || 0,
        })),
      };
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, documents: true, activities: true },
    });

    return res.json({
      message: "Contract updated successfully.",
      contract: updatedContract,
    });
  }),
);

router.delete(
  "/:id",
  protect,
  requireModulePermission("contracts", "canDelete"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const contract = await prisma.contract.findUnique({ where: { id } });

    if (!contract) {
      throw new ApiError(404, "Contract not found.");
    }

    if (req.user.role === "STAFF" && contract.userId !== req.user.id) {
      throw new ApiError(
        403,
        "Forbidden. You can only delete your own contracts.",
      );
    }

    await prisma.contract.delete({ where: { id } });

    return res.json({ message: "Contract deleted successfully." });
  }),
);

router.post(
  "/:id/attachments",
  protect,
  requireModulePermission("contracts", "canCreate"),
  asyncHandler(async (req, res) => {
    const contractId = Number(req.params.id);
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new ApiError(404, "Contract not found.");
    }

    const { name, fileUrl, fileType, category, versionLabel, notes } = req.body;

    if (!name || !fileUrl || !category) {
      throw new ApiError(
        400,
        "Attachment name, file URL, and category are required.",
      );
    }

    const document = await prisma.contractDocument.create({
      data: {
        contract: { connect: { id: contractId } },
        uploadedBy: { connect: { id: req.user.id } },
        name,
        fileUrl,
        fileType: fileType || "application/octet-stream",
        category,
        versionLabel: versionLabel || null,
        notes: notes || null,
      },
    });

    return res
      .status(201)
      .json({ message: "Attachment added to contract.", document });
  }),
);

router.delete(
  "/:id/attachments/:attachmentId",
  protect,
  requireModulePermission("contracts", "canDelete"),
  asyncHandler(async (req, res) => {
    const contractId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    const document = await prisma.contractDocument.findFirst({
      where: { id: attachmentId, contractId },
    });

    if (!document) {
      throw new ApiError(404, "Attachment not found for this contract.");
    }

    await prisma.contractDocument.delete({ where: { id: attachmentId } });

    return res.json({ message: "Attachment removed successfully." });
  }),
);

export default router;
