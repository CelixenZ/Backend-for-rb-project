import prisma from "../../config/prisma";

import express from "express";
import {
  protect,
  requireModulePermission,
} from "../../middleware/auth.middleware";
import asyncHandler from "../../shared/utils/asyncHandler";
import ApiError from "../../shared/utils/apiError";

const router = express.Router();

router.get(
  "/",
  protect,
  requireModulePermission("activities", "canRead"),
  asyncHandler(async (req, res) => {
    const logs = await prisma.activity.findMany({
      include: {
        contract: { select: { contractNumber: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(logs);
  }),
);

router.post(
  "/",
  protect,
  requireModulePermission("activities", "canCreate"),
  asyncHandler(async (req, res) => {
    const { contractId, actionType, content, fileUrl } = req.body;

    if (!contractId || !actionType) {
      throw new ApiError(
        400,
        "Contract ID and action type are required for activity logs.",
      );
    }

    const contract = await prisma.contract.findUnique({
      where: { id: Number(contractId) },
    });

    if (!contract) {
      throw new ApiError(404, "Contract not found.");
    }

    const activity = await prisma.activity.create({
      data: {
        contract: { connect: { id: Number(contractId) } },
        user: { connect: { id: req.user.id } },
        userName: req.user.fullName || req.user.username,
        actionType,
        content: content || null,
        fileUrl: fileUrl || null,
      },
    });

    return res
      .status(201)
      .json({ message: "Activity recorded successfully.", activity });
  }),
);

export default router;
