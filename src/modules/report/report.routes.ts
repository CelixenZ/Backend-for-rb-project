import { Router } from "express";
import puppeteer from "puppeteer-core";
import ExcelJS from "exceljs";
import prisma from "../../config/prisma";
import { protect, requireModulePermission } from "../../middleware/auth.middleware";
import asyncHandler from "../../shared/utils/asyncHandler";

const router = Router();

const toNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && typeof value.toString === "function") {
    const parsed = Number(value.toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return Number(value);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const buildReportData = async () => {
  const contracts = await prisma.contract.findMany({
    include: {
      customer: {
        select: {
          nameEn: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalRevenue = contracts.reduce((sum, contract) => sum + toNumber(contract.grandTotal), 0);
  const revenueByCustomer = contracts.reduce<Record<string, number>>((acc, contract) => {
    const name = contract.customer?.nameEn || "Unknown";
    acc[name] = (acc[name] || 0) + toNumber(contract.grandTotal);
    return acc;
  }, {});

  const statusCounts = contracts.reduce<Record<string, number>>((acc, contract) => {
    const status = contract.status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const marginBuckets = contracts.reduce(
    (acc, contract) => {
      const margin = toNumber(contract.profitMargin);
      if (margin >= 30) acc.high += 1;
      else if (margin >= 15) acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return {
    generatedAt: new Date().toLocaleString("en-US"),
    totalRevenue,
    totalContracts: contracts.length,
    revenueByCustomer,
    statusCounts,
    marginBuckets,
    contracts: contracts.map((contract) => ({
      contractNumber: contract.contractNumber,
      customer: contract.customer?.nameEn || "Unknown",
      status: contract.status,
      grandTotal: toNumber(contract.grandTotal),
      profitMargin: toNumber(contract.profitMargin),
    })),
  };
};

const buildPdfHtml = (report: Awaited<ReturnType<typeof buildReportData>>) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 24px; margin-bottom: 6px; }
      .subtitle { color: #64748b; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
      th { background: #f8fafc; }
    </style>
  </head>
  <body>
    <h1>Contracts Export</h1>
    <div class="subtitle">Generated on ${report.generatedAt}</div>

    <table>
      <thead>
        <tr>
          <th>Contract #</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Revenue</th>
          <th>Profit Margin</th>
        </tr>
      </thead>
      <tbody>
        ${report.contracts
          .map(
            (contract) => `<tr><td>${contract.contractNumber}</td><td>${contract.customer}</td><td>${contract.status}</td><td>${formatCurrency(contract.grandTotal)}</td><td>${contract.profitMargin}%</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

const getBrowser = async () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || process.env.CHROMIUM_PATH;

  return puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

router.get(
  "/export/pdf",
  protect,
  requireModulePermission("reports", "canRead"),
  asyncHandler(async (req, res) => {
    const report = await buildReportData();
    const browser = await getBrowser();

    try {
      const page = await browser.newPage();
      await page.setContent(buildPdfHtml(report), { waitUntil: "load" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "12mm",
          right: "10mm",
          bottom: "12mm",
          left: "10mm",
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="contracts-report.pdf"');
      res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  }),
);

router.get(
  "/export/excel",
  protect,
  requireModulePermission("reports", "canRead"),
  asyncHandler(async (req, res) => {
    const report = await buildReportData();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ICMS";
    workbook.lastModifiedBy = "ICMS";
    workbook.created = new Date();
    workbook.modified = new Date();

    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 25 },
    ];
    summarySheet.addRows([
      ["Generated At", report.generatedAt],
      ["Total Revenue", formatCurrency(report.totalRevenue)],
      ["Total Contracts", report.totalContracts],
      ["High Margin Contracts", report.marginBuckets.high],
      ["Medium Margin Contracts", report.marginBuckets.medium],
      ["Low Margin Contracts", report.marginBuckets.low],
    ]);

    const contractsSheet = workbook.addWorksheet("Contracts");
    contractsSheet.columns = [
      { header: "Contract #", key: "contractNumber", width: 20 },
      { header: "Customer", key: "customer", width: 25 },
      { header: "Status", key: "status", width: 18 },
      { header: "Revenue", key: "grandTotal", width: 16 },
      { header: "Profit Margin", key: "profitMargin", width: 16 },
    ];
    contractsSheet.addRows(
      report.contracts.map((contract) => ({
        contractNumber: contract.contractNumber,
        customer: contract.customer,
        status: contract.status,
        grandTotal: formatCurrency(contract.grandTotal),
        profitMargin: `${contract.profitMargin}%`,
      })),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="contracts-report.xlsx"');
    res.send(buffer);
  }),
);

export default router;
