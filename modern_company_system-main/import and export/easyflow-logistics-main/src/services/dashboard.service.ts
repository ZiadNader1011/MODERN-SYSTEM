import { prisma } from '../../backend/lib/prisma.js';

export const getDashboardData = async () => {
  // 1. جلب البيانات الأساسية بالتوازي
  const [
    jobs,
    containers,
    products,
    transactions,
    summaryView // جلب البيانات المحسوبة من الـ View
  ] = await Promise.all([
    prisma.job.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } }
    }),
    prisma.container.findMany(),
    prisma.product.findMany(),
    prisma.transaction.findMany(),
    prisma.$queryRaw`SELECT * FROM dashboard_view LIMIT 1`
  ]);

  const data = summaryView[0] || {};


  return {
   
    totalSales: {
      USD: Number(data.total_sales_usd || 0),
      EGP: Number(data.total_sales_egp || 0)
    },
    clientDebt: Number(data.client_payments || 0),
    supplierDebt: Number(data.supplier_cost || 0),
    agentCost: Number(data.agent_cost || 0),

   
    stats: {
      totalJobs: jobs.length,
      activeContainers: containers.filter(c => c.status !== "cleared").length,
      totalProducts: products.length,
      totalTransactions: transactions.length
    },

   
    recentJobs: jobs,
    activeShipments: containers.filter(c => c.status !== "cleared").slice(0, 6)
  };
};