const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// Note: Kept your original imports, though getRolePermissions might be obsolete now!
const { protect, normalizeRole, getPublicRole, getRolePermissions, requireModulePermission } = require('../middleware/authMiddleware');

const requireJwtSecrets = () => {
  if (!process.env.JWT_SECRET) {
    console.error("❌ CRITICAL ERROR: JWT_SECRET is not defined in your environment variables!");
    throw new ApiError(500, "Server configuration error");
  }
};  

const generateAccessToken = (user) => {
  requireJwtSecrets();
  return jwt.sign(
    { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

const generateRefreshToken = (user) => {
  requireJwtSecrets();
  return jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const createTokenResponse = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user)
});

// 🛠️ UPGRADE: Added 'include: { permissions: true }' so tokens carry the matrix
const invalidateUserSession = async (userId) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    include: { permissions: true } 
  });
  return updatedUser;
};

const refreshUserSession = async (userId) => {
  const updatedUser = await invalidateUserSession(userId);
  return { user: updatedUser, tokens: createTokenResponse(updatedUser) };
};

// 🛠️ UPGRADE: Added permissions array to the sanitized output
const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  role: user.role, // Or getPublicRole(user.role) if you prefer
  status: user.status,
  permissions: user.permissions || [] 
});

// ==========================================
// 1. GET ACTIVE USER PERMISSIONS
// ==========================================
router.get('/permissions', protect, asyncHandler(async (req, res) => {
  // 🛠️ UPGRADE: Fetch dynamic database permissions instead of hardcoded ones
  const userWithPerms = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { permissions: true }
  });

  if (!userWithPerms) {
    throw new ApiError(404, 'User not found.');
  }

  return res.json({
    role: userWithPerms.role,
    permissions: userWithPerms.permissions
  });
}));

// ==========================================
// 1.a GET CURRENT SANITIZED USER (for client refresh)
// ==========================================
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { permissions: true }
  });

  if (!user) throw new ApiError(404, 'User not found.');

  return res.json({ user: sanitizeUser(user) });
}));

// ==========================================
// 2. ADMIN-ONLY: CREATE NEW USER & PERMISSIONS
// ==========================================
router.post('/create-user', protect, requireModulePermission('users', 'canCreate'), asyncHandler(async (req, res) => {
  const { fullName, email, username, password, role, permissions } = req.body;

  if (!fullName || !email || !username || !password) {
    throw new ApiError(400, 'Please fill in all required fields.');
  }

  // Default to STAFF if the admin didn't explicitly send ADMIN
  const userRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';

  const userExists = await prisma.user.findFirst({
    where: {
      OR: [
        { email: String(email).toLowerCase() },
        { username: String(username).toLowerCase() }
      ]
    }
  });

  if (userExists) {
    throw new ApiError(400, 'Username or Email already registered.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 🛠️ UPGRADE: Transactionally save the user and their permissions matrix
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email: String(email).toLowerCase(),
        username: String(username).toLowerCase(),
        password: hashedPassword,
        role: userRole,
        status: true
      }
    });

    // If the admin passed an array of permissions, seed them
    if (permissions && Array.isArray(permissions)) {
      const permissionData = permissions.map(p => ({
        userId: user.id,
        module: String(p.module).toLowerCase(),
        canRead: Boolean(p.canRead),
        canWrite: Boolean(p.canWrite),
        canCreate: Boolean(p.canCreate),
        canDelete: Boolean(p.canDelete)
      }));
      await tx.permission.createMany({ data: permissionData });
    }
    return user;
  });

  // Fetch complete user with seeded matrix to return
  const completeUser = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: { permissions: true }
  });

  return res.status(201).json({
    message: 'Staff profile provisioned successfully!',
    user: sanitizeUser(completeUser)
  });
}));

// ==========================================
// 3. LOGIN
// ==========================================
router.post('/login', asyncHandler(async (req, res) => {
  const { username, email, usernameOrEmail, password } = req.body;
  const loginValue = String(usernameOrEmail || username || email || '').toLowerCase();

  if (!loginValue || !password) {
    throw new ApiError(400, 'Please provide both username/email and password.');
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: loginValue },
        { email: loginValue }
      ]
    }
  });

  if (!user || !user.status) {
    throw new ApiError(401, 'Invalid credentials or account inactive.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  // refreshUserSession now includes the permissions!
  const { tokens: newTokens, user: updatedUser } = await refreshUserSession(user.id);

  return res.json({
    message: 'Login successful!',
    user: sanitizeUser(updatedUser),
    token: newTokens.accessToken,
    refreshToken: newTokens.refreshToken
  });
}));

// ==========================================
// 4. LOGOUT
// ==========================================
router.post('/logout', protect, asyncHandler(async (req, res) => {
  await invalidateUserSession(req.user.id);

  return res.json({
    message: 'Logout successful. The current session has been invalidated.'
  });
}));

// ==========================================
// 5. CHANGE PASSWORD
// ==========================================
router.post('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required.');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long.');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, password: true }
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  await invalidateUserSession(user.id);

  return res.json({
    message: 'Password updated successfully. All sessions have been invalidated. Please log in again.'
  });
}));

// ==========================================
// 6. REFRESH TOKEN
// ==========================================
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required.');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id }
  });

  if (!user || !user.status) {
    throw new ApiError(401, 'Invalid refresh token or user is inactive.');
  }

  if (decoded.tokenVersion !== user.tokenVersion) {
    throw new ApiError(401, 'Refresh token has been invalidated.');
  }

  const { tokens: newTokens, user: updatedUser } = await refreshUserSession(user.id);

  return res.json({
    message: 'Token refreshed successfully.',
    token: newTokens.accessToken,
    refreshToken: newTokens.refreshToken
  });
}));

// ==========================================
// 7. UPDATE PERMISSIONS FOR A USER (ADMIN)
// ==========================================
router.put('/update-permissions/:id', protect, requireModulePermission('users', 'canWrite'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    throw new ApiError(400, 'Permissions must be an array.');
  }

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) throw new ApiError(404, 'User not found.');

  // Transactionally replace permissions
  await prisma.$transaction(async (tx) => {
    await tx.permission.deleteMany({ where: { userId: id } });

    const data = permissions.map((p) => ({
      userId: id,
      module: String(p.module).toLowerCase(),
      canRead: Boolean(p.canRead),
      canWrite: Boolean(p.canWrite),
      canCreate: Boolean(p.canCreate),
      canDelete: Boolean(p.canDelete),
    }));

    if (data.length > 0) await tx.permission.createMany({ data });
  });

  const updated = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      role: true,
      status: true,
      permissions: true
    }
  });

  return res.json({ message: 'Permissions updated.', user: updated });
}));

 
module.exports = router;