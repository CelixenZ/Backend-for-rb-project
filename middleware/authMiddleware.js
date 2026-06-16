const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const roleAliases = {
  USER: 'STAFF'
};

const validRoles = ['ADMIN', 'STAFF'];

const rolePermissions = {
  ADMIN: [
    'createContracts',
    'editContracts',
    'deleteContracts',
    'manageCustomers',
    'manageServices',
    'viewReports',
    'uploadFiles',
    'configureRenewalAlerts'
  ],
  
  STAFF: [
    'viewContracts',
    'updateRemarksStatus',
    'uploadSupportingDocuments',
    'viewAssignedReports'
  ]
};

const normalizeRole = (role) => {
  const normalized = String(role || '').toUpperCase();

  if (!normalized) {
    return 'STAFF';
  }

  const effectiveRole = roleAliases[normalized] || normalized;

  if (!validRoles.includes(effectiveRole)) {
    throw new Error('Invalid role. Must be ADMIN, or STAFF.');
  }

  return effectiveRole;
};

const getPublicRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'STAFF' ? 'USER' : normalized;
};

const getRolePermissions = (role) => {
  const normalized = normalizeRole(role);
  return rolePermissions[normalized] || [];
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          status: true,
          tokenVersion: true,
          permissions: true
        }
      });

      if (!req.user || !req.user.status) {
        return res.status(401).json({ message: "Not authorized. Account is inactive or does not exist." });
      }

      if (decoded.tokenVersion !== req.user.tokenVersion) {
        return res.status(401).json({ message: "Not authorized. Token has been invalidated." });
      }

      return next();
    } catch (error) {
      console.error("❌ Middleware Security Violation:", error.message);
      return res.status(401).json({ message: "Not authorized, token validation failed." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no security token provided." });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, authentication required." });
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden. You do not have permission to perform this action." });
    }

    return next();
  };
};

const checkModulePermission = (user, moduleName, action) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions) return false;

  const modulePermission = user.permissions.find(
    (p) => String(p.module).toLowerCase() === String(moduleName).toLowerCase()
  );

  return !!(modulePermission && modulePermission[action]);
};

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, authentication required." });
    }

    const userRole = normalizeRole(req.user.role);
    const userPermissions = getRolePermissions(userRole);

    if (!permissions.every((permission) => userPermissions.includes(permission))) {
      return res.status(403).json({ message: "Forbidden. You do not have permission to perform this action." });
    }

    return next();
  };
};

const requireModulePermission = (moduleName, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, authentication required." });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const isAllowed = checkModulePermission(req.user, moduleName, action);
    if (!isAllowed) {
      return res.status(403).json({ message: "Forbidden. You do not have permission to perform this action." });
    }

    return next();
  };
};

module.exports = {
  protect,
  requireRole,
  requirePermission,
  requireModulePermission,
  normalizeRole,
  getPublicRole,
  getRolePermissions,
  rolePermissions
};
