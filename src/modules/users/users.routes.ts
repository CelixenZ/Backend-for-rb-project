import { Router } from "express";
import {
  normalizeRole,
  protect,
  requireModulePermission,
} from "../../middleware/auth.middleware";
import asyncHandler from "../../shared/utils/asyncHandler";
import prisma from "../../config/prisma";
import ApiError from "../../shared/utils/apiError";
import * as bcrypt from "bcryptjs";

const router = Router();

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  role: user.role,
  status: user.status,
  permissions: user.permissions || [],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.use(protect);

router.get(
  "/",
  requireModulePermission("users", "canRead"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  }),
);

router.get(
  "/:id",
  requireModulePermission("users", "canRead"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    return res.json(sanitizeUser(user));
  }),
);

router.post(
  "/",
  requireModulePermission("users", "canCreate"),
  asyncHandler(async (req, res) => {
    const { fullName, email, username, password, role, status } = req.body;

    if (!fullName || !email || !username || !password) {
      throw new ApiError(
        400,
        "Full name, email, username, and password are required.",
      );
    }

    const normalizedRole = normalizeRole(role);

    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { email: String(email).toLowerCase() },
          { username: String(username).toLowerCase() },
        ],
      },
    });

    if (userExists) {
      throw new ApiError(400, "Username or Email already registered.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const createdUser = await prisma.user.create({
      data: {
        fullName,
        email: String(email).toLowerCase(),
        username: String(username).toLowerCase(),
        password: hashedPassword,
        role: normalizedRole,
        status: status === undefined ? true : Boolean(status),
      },
    });

    return res.status(201).json({
      message: "User created successfully.",
      user: sanitizeUser(createdUser),
    });
  }),
);

router.put(
  "/:id",
  requireModulePermission("users", "canWrite"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { fullName, email, username, role, status, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new ApiError(404, "User not found.");
    }

    const duplicateUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { email: String(email).toLowerCase() },
              { username: String(username).toLowerCase() },
            ],
          },
        ],
      },
    });

    if (duplicateUser) {
      throw new ApiError(400, "Username or Email already registered.");
    }

    const updateData: any = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = String(email).toLowerCase();
    if (username !== undefined)
      updateData.username = String(username).toLowerCase();
    if (role !== undefined) updateData.role = normalizeRole(role);
    if (status !== undefined) updateData.status = Boolean(status);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      message: "User updated successfully.",
      user: sanitizeUser(updatedUser),
    });
  }),
);

router.delete(
  "/:id",
  requireModulePermission("users", "canDelete"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new ApiError(404, "User not found.");
    }

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ message: "User deleted successfully." });
  }),
);

export default router;
