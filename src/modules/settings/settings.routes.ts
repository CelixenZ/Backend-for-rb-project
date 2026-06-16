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
  requireModulePermission("settings", "canRead"),
  asyncHandler(async (req, res) => {
    const settings = await prisma.companySettings.findFirst();

    if (!settings) {
      throw new ApiError(404, "Company settings have not been configured yet.");
    }

    return res.json(settings);
  }),
);

router.post(
  "/",
  protect,
  requireModulePermission("settings", "canCreate"),
  asyncHandler(async (req, res) => {
    const {
      companyName,
      companyNameKh,
      address,
      phone,
      email,
      vatTin,
      defaultTaxRate,
      currency,
      contractPrefix,
      logoUrl,
    } = req.body;

    if (!companyName || !address || !phone || !email) {
      throw new ApiError(
        400,
        "Company name, address, phone, and email are required.",
      );
    }

    const settings = await prisma.companySettings.create({
      data: {
        companyName,
        companyNameKh: companyNameKh || null,
        address,
        phone,
        email,
        vatTin: vatTin || null,
        defaultTaxRate: defaultTaxRate || 0,
        currency: currency || "USD",
        contractPrefix: contractPrefix || "CON-",
        logoUrl: logoUrl || null,
      },
    });

    return res
      .status(201)
      .json({ message: "Company settings saved successfully.", settings });
  }),
);

router.put(
  "/",
  protect,
  requireModulePermission("settings", "canWrite"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.companySettings.findFirst();

    if (!existing) {
      throw new ApiError(
        404,
        "Company settings must be created before they can be updated.",
      );
    }

    const updateData = {
      companyName:
        req.body.companyName !== undefined
          ? req.body.companyName
          : existing.companyName,
      companyNameKh:
        req.body.companyNameKh !== undefined
          ? req.body.companyNameKh
          : existing.companyNameKh,
      address:
        req.body.address !== undefined ? req.body.address : existing.address,
      phone: req.body.phone !== undefined ? req.body.phone : existing.phone,
      email: req.body.email !== undefined ? req.body.email : existing.email,
      vatTin: req.body.vatTin !== undefined ? req.body.vatTin : existing.vatTin,
      defaultTaxRate:
        req.body.defaultTaxRate !== undefined
          ? req.body.defaultTaxRate
          : existing.defaultTaxRate,
      currency:
        req.body.currency !== undefined ? req.body.currency : existing.currency,
      contractPrefix:
        req.body.contractPrefix !== undefined
          ? req.body.contractPrefix
          : existing.contractPrefix,
      logoUrl:
        req.body.logoUrl !== undefined ? req.body.logoUrl : existing.logoUrl,
    };

    const updated = await prisma.companySettings.update({
      where: { id: existing.id },
      data: updateData,
    });

    return res.json({
      message: "Company settings updated successfully.",
      settings: updated,
    });
  }),
);

export default router;
