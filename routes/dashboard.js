const express = require('express');
const prisma = require('../lib/prisma');
const { protect, requireModulePermission } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// @desc    Get dashboard statistics and report summary
// @route   GET /api/dashboard/stats
// @access  Private (Dashboard Read Permission)
router.get('/stats', protect, requireModulePermission('dashboard', 'canRead'), asyncHandler(async (req, res) => {
  const aggregate = await prisma.contract.aggregate({
    _count: { id: true },
    _sum: { grandTotal: true, internalCost: true },
    _avg: { profitMargin: true }
  });

  const totalContracts = aggregate._count.id || 0;
  const totalRevenue = Number(aggregate._sum.grandTotal) || 0;
  const totalInternalCost = Number(aggregate._sum.internalCost) || 0;
  const netProfit = totalRevenue - totalInternalCost;
  const avgProfitMargin = Number(aggregate._avg.profitMargin) || 0;

  // 1. Get status breakdown for a "report" view
  const statusCounts = await prisma.contract.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const activeContracts = statusCounts.find(s => s.status === 'ACTIVE')?._count.id || 0;

  // 2. Contracts Expiring Soon (<= 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringSoonCount = await prisma.contract.count({
    where: {
      endDate: {
        lte: thirtyDaysFromNow,
        gte: new Date()
      },
      status: 'ACTIVE'
    }
  });

  // 3. Get top customers by revenue
  const topCustomers = await prisma.customer.findMany({
    take: 5,
    include: {
      _count: { select: { contracts: true } },
      contracts: { select: { grandTotal: true } }
    },
  });

  const formattedTopCustomers = topCustomers.map(c => ({
    name: c.nameEn,
    contractCount: c._count.contracts,
    totalValue: c.contracts.reduce((sum, contract) => sum + Number(contract.grandTotal), 0)
  })).sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

  // 4. Get most recent high-value contracts
  const recentContracts = await prisma.contract.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: { customer: { select: { nameEn: true } } }
  });

  return res.json({
    totalContracts,
    activeContracts,
    totalRevenue,
    totalInternalCost,
    netProfit,
    avgProfitMargin,
    expiringSoonCount,
    statusBreakdown: statusCounts.map(s => ({ status: s.status, count: s._count.id })),
    topCustomers: formattedTopCustomers,
    recentContracts: recentContracts.map(c => ({
      id: c.id,
      number: c.contractNumber,
      customer: c.customer.nameEn,
      amount: c.grandTotal,
      status: c.status,
      date: c.updatedAt
    }))
  });
}));

module.exports = router;
