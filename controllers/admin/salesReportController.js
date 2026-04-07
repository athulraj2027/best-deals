const Order = require("../../models/Order");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

/**
 * GENERATE EXCEL REPORT
 * Professional formatting with auto-filters and styling
 */
async function generateExcel(data, res) {
  try {
    const workbook = new ExcelJS.Workbook();

    // 1. SUMMARY SHEET
    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 25 },
    ];
    summary.addRows([
      {
        metric: "Report Period",
        value: `${data.start_date_formatted} - ${data.end_date_formatted}`,
      },
      { metric: "Total Orders", value: data.sales_count },
      { metric: "Gross Revenue", value: data.total_sales_amount },
      { metric: "Total Discount", value: data.total_discount },
      {
        metric: "Net Revenue",
        value: data.total_sales_amount - data.total_discount,
      },
      { metric: "Total Items Sold", value: data.total_items_sold },
      { metric: "Average Order Value", value: data.average_order_value },
    ]);

    // Style summary headers
    summary.getRow(1).font = { bold: true };
    summary.getColumn("value").numFmt = "₹#,##0.00";

    // 2. DETAILED ORDERS SHEET
    const ordersSheet = workbook.addWorksheet("Orders Detail");
    ordersSheet.columns = [
      { header: "Order ID", key: "id", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Customer", key: "user", width: 25 },
      { header: "Payment", key: "payment", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Total Amount", key: "amount", width: 15 },
    ];

    data.orders.forEach((o) => {
      ordersSheet.addRow({
        id: o.orderId,
        date: new Date(o.orderDate).toLocaleDateString(),
        user: o.userId?.name || "N/A",
        payment: o.paymentMethod,
        status: o.status,
        discount: o.coupon?.discountAmount || 0,
        amount: o.grandTotal,
      });
    });

    // Add Table Styling
    ordersSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    ordersSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    ordersSheet.getColumn("amount").numFmt = "₹#,##0.00";
    ordersSheet.getColumn("discount").numFmt = "₹#,##0.00";
    ordersSheet.autoFilter = "A1:G1";

    // 3. TOP PRODUCTS SHEET
    const productSheet = workbook.addWorksheet("Product Performance");
    productSheet.columns = [
      { header: "Product Name", key: "name", width: 35 },
      { header: "Quantity Sold", key: "qty", width: 15 },
      { header: "Revenue Generated", key: "revenue", width: 20 },
    ];
    data.topProducts.forEach((p) => {
      productSheet.addRow({
        name: p.name,
        qty: p.quantity,
        revenue: p.revenue,
      });
    });
    productSheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Sales_Report_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Gen Error:", err);
    res.status(500).send("Excel generation failed");
  }
}

/**
 * GENERATE PDF REPORT
 * Clean, tabular layout in Landscape mode
 */
function generatePDF(data, res) {
  try {
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Sales_Report_${Date.now()}.pdf`,
    );
    doc.pipe(res);

    // Header
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("SALES ANALYTICS REPORT", { align: "center" });
    doc
      .fontSize(10)
      .text(`${data.start_date_formatted} to ${data.end_date_formatted}`, {
        align: "center",
      });
    doc.moveDown();

    // Stats Grid
    const startX = 30;
    let currentY = doc.y;

    doc.rect(startX, currentY, 780, 50).fill("#f9f9f9").stroke();
    doc.fillColor("#000").fontSize(12).font("Helvetica-Bold");

    doc.text("Total Orders", 50, currentY + 10);
    doc.text("Gross Revenue", 200, currentY + 10);
    doc.text("Total Discount", 400, currentY + 10);
    doc.text("Avg Order Value", 600, currentY + 10);

    doc.font("Helvetica").fontSize(11);
    doc.text(data.sales_count, 50, currentY + 30);
    doc.text(
      `₹${data.total_sales_amount.toLocaleString()}`,
      200,
      currentY + 30,
    );
    doc.text(`₹${data.total_discount.toLocaleString()}`, 400, currentY + 30);
    doc.text(
      `₹${data.average_order_value.toLocaleString()}`,
      600,
      currentY + 30,
    );

    doc.moveDown(4);

    // Table Header
    const tableTop = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Order ID", 30, tableTop);
    doc.text("Customer", 150, tableTop);
    doc.text("Date", 350, tableTop);
    doc.text("Payment", 450, tableTop);
    doc.text("Status", 550, tableTop);
    doc.text("Amount", 700, tableTop, { align: "right" });

    doc
      .moveTo(30, tableTop + 15)
      .lineTo(790, tableTop + 15)
      .stroke();

    // Table Rows
    let rowY = tableTop + 25;
    doc.font("Helvetica").fontSize(9);

    data.orders.forEach((o) => {
      if (rowY > 500) {
        doc.addPage({ layout: "landscape" });
        rowY = 50;
      }
      const maskedId = "*****" + o.orderId.slice(-5);

      doc.text(maskedId, 30, rowY);
      doc.text(o.userId?.name || "Guest", 150, rowY);
      doc.text(new Date(o.orderDate).toLocaleDateString(), 350, rowY);
      doc.text(o.paymentMethod, 450, rowY);
      doc.text(o.status, 550, rowY);
      doc.text(`₹${o.grandTotal.toLocaleString()}`, 700, rowY, {
        align: "right",
      });
      rowY += 20;
    });

    doc.end();
  } catch (err) {
    console.error("PDF Gen Error:", err);
    res.status(500).send("PDF generation failed");
  }
}

/**
 * ANALYTICS ENGINE
 * Aggregates all necessary data in one DB pass
 */
async function generateSalesData(startDate, endDate) {
  const orders = await Order.find({
    orderDate: { $gte: startDate, $lte: endDate },
    status: { $nin: ["cancelled"] },
  })
    .populate("userId", "name email")
    .sort({ orderDate: -1 });

  let stats = {
    totalRevenue: 0,
    totalDiscount: 0,
    totalItems: 0,
    productSales: {},
    dailySales: {},
    ordersByStatus: {},
    ordersByPayment: {},
  };

  orders.forEach((order) => {
    const dateKey = order.orderDate.toISOString().split("T")[0];

    // Basic Stats
    stats.totalRevenue += order.grandTotal;
    stats.totalDiscount += order.coupon?.discountAmount || 0;

    // Daily breakdown
    if (!stats.dailySales[dateKey])
      stats.dailySales[dateKey] = { revenue: 0, count: 0 };
    stats.dailySales[dateKey].revenue += order.grandTotal;
    stats.dailySales[dateKey].count++;

    // Status/Payment breakdown
    stats.ordersByStatus[order.status] =
      (stats.ordersByStatus[order.status] || 0) + 1;
    stats.ordersByPayment[order.paymentMethod] =
      (stats.ordersByPayment[order.paymentMethod] || 0) + 1;

    // Product Logic
    order.items.forEach((item) => {
      if (item.status === "returned" || item.status === "cancelled") return;

      stats.totalItems += item.quantity;
      const pId = item.productId.toString();
      if (!stats.productSales[pId]) {
        stats.productSales[pId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      stats.productSales[pId].quantity += item.quantity;
      stats.productSales[pId].revenue += item.price * item.quantity;
    });
  });

  return { orders, ...stats };
}

/**
 * MAIN CONTROLLER
 */
exports.getSalesReport = async (req, res) => {
  console.log("req body : ", req.body);
  console.log("req params : ", req.params);
  console.log("req query : ", req.query);
  try {
    const { type = "daily", start_date, end_date, download } = req.query;

    const range = getDateRange(type, req.query);
    console.log("range : ", range);
    const report = await generateSalesData(range.start_date, range.end_date);

    const topProducts = Object.values(report.productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const data = {
      start_date_formatted: range.start_date.toDateString(),
      end_date_formatted: range.end_date.toDateString(),
      sales_count: report.orders.length,
      total_sales_amount: report.totalRevenue,
      total_discount: report.totalDiscount,
      total_items_sold: report.totalItems,
      average_order_value:
        report.orders.length > 0
          ? (report.totalRevenue / report.orders.length).toFixed(2)
          : 0,
      orders: report.orders,
      topProducts,
      dailySales: report.dailySales,
      ordersByStatus: report.ordersByStatus,
      ordersByPaymentMethod: report.ordersByPayment,
    };

    if (download === "pdf") return generatePDF(data, res);
    if (download === "excel") return generateExcel(data, res);

    res.render("adminPages/salesReport", data);
  } catch (error) {
    console.error("Main Report Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

/**
 * HELPER: DATE CALCULATOR
 */
function getDateRange(type, params) {
  let start_date = new Date();
  let end_date = new Date();

  switch (type) {
    case "daily": {
      const d = params.date ? new Date(params.date) : new Date();

      start_date = new Date(d);
      start_date.setHours(0, 0, 0, 0);

      end_date = new Date(start_date);
      end_date.setDate(start_date.getDate() + 1); // next day 00:00
      break;
    }

    case "weekly": {
      const base = params.start_date ? new Date(params.start_date) : new Date();

      start_date = new Date(base);
      start_date.setHours(0, 0, 0, 0);

      // optional: align to week start (Sunday)
      const day = start_date.getDay();
      start_date.setDate(start_date.getDate() - day);

      end_date = new Date(start_date);
      end_date.setDate(start_date.getDate() + 7); // +7 days
      break;
    }

    case "monthly": {
      const month = params.month
        ? parseInt(params.month) - 1
        : new Date().getMonth();

      const year = params.year
        ? parseInt(params.year)
        : new Date().getFullYear();

      start_date = new Date(year, month, 1);
      start_date.setHours(0, 0, 0, 0);

      end_date = new Date(year, month + 1, 1); // next month start
      break;
    }

    case "yearly": {
      const year = params.year
        ? parseInt(params.year)
        : new Date().getFullYear();

      start_date = new Date(year, 0, 1);
      start_date.setHours(0, 0, 0, 0);

      end_date = new Date(year + 1, 0, 1); // next year start
      break;
    }

    case "custom": {
      start_date = new Date(params.start_date);
      start_date.setHours(0, 0, 0, 0);

      end_date = new Date(params.end_date);
      end_date.setHours(0, 0, 0, 0);

      end_date.setDate(end_date.getDate() + 1); // make it exclusive
      break;
    }
  }

  return { start_date, end_date };
}

/* =========================
   ORDERS API (FIXED)
========================= */
exports.getOrdersData = async (req, res) => {
  try {
    const { period = "week" } = req.query;

    let startDate,
      endDate = new Date();

    if (period === "day") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "year") {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const report = await generateSalesData(startDate, endDate);

    const chartData = Object.entries(report.dailySales)
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        orderCount: report.orders.length,
        totalRevenue: report.totalRevenue,
        chartData,
        recentOrders: report.orders.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders data" });
  }
};

/* =========================
   SALES REPORT PAGE FIX
========================= */
exports.getSalesReportPage = async (req, res) => {
  try {
    const { start_date, end_date } = getDateRange("monthly", {});

    const report = await generateSalesData(start_date, end_date);

    // console.log("report : ", report);

    res.render("adminPages/salesReport", {
      sales_count: report.orders.length,
      total_sales_amount: report.totalRevenue,
      total_items_sold: report.totalItems,
      dailySales: JSON.stringify(report.dailySales),
      topProducts: JSON.stringify(
        Object.values(report.productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      ),
      orders: report.orders.slice(0, 10),
    });
  } catch (error) {
    res.status(500).send("Error loading report page");
  }
};
