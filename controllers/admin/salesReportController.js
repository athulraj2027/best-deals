const Order = require("../../models/Order");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

exports.getSalesReport = async (req, res) => {
  try {
    let { type, date, start_date, end_date, month, year, download } = req.query;

    console.log("Request query: ", req.query);

    // Handle array parameters (common in form submissions)
    date = Array.isArray(date) ? date[0] : date;
    start_date = Array.isArray(start_date) ? start_date[0] : start_date;
    end_date = Array.isArray(end_date) ? end_date[0] : end_date;
    month = Array.isArray(month) ? month[0] : month;
    year = Array.isArray(year) ? year[0] : year;
    download = Array.isArray(download) ? download[0] : download;
    type = Array.isArray(type) ? type[0] : type;

    // Validate inputs
    if (!type) {
      return res.status(400).send("Report type is required");
    }

    let params = { date, start_date, end_date, month, year };
    let { start_date: startDate, end_date: endDate } = getDateRange(
      type,
      params,
    );

    // Ensure valid date range
    if (!startDate || !endDate) {
      return res.status(400).send("Invalid date range parameters");
    }

    console.log(
      `Using date range: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get orders within date range - populate address for better reporting
    let orders = await Order.find({
      orderDate: { $gte: startDate, $lt: endDate },
    })
      .populate("userId", "name email")
      .populate("addressId")
      .sort({ orderDate: -1 });

    // Calculate metrics
    let sales_count = orders.length;
    let total_sales_amount = orders.reduce(
      (sum, order) => sum + order.grandTotal,
      0,
    );

    // Track product sales and calculate item totals
    let productSales = {};
    let total_items_sold = 0;

    orders.forEach((order) => {
      order.items.forEach((item) => {
        total_items_sold += item.quantity;

        // Track product sales
        const productKey = item.productId.toString();
        if (productSales[productKey]) {
          productSales[productKey].quantity += item.quantity;
          productSales[productKey].revenue += item.price * item.quantity;
        } else {
          productSales[productKey] = {
            name: item.name || "Unknown Product",
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          };
        }
      });
    });

    // Get top 10 products by revenue
    let topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get top 10 products by quantity
    let topProductsByQuantity = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Daily sales for the period (for chart)
    let dailySales = {};
    let currentDate = new Date(startDate);

    // Initialize all dates in range
    while (currentDate < endDate) {
      let dateStr = currentDate.toISOString().split("T")[0];
      dailySales[dateStr] = { revenue: 0, orders: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in sales data
    orders.forEach((order) => {
      let orderDateStr = new Date(order.orderDate).toISOString().split("T")[0];
      if (dailySales[orderDateStr] !== undefined) {
        dailySales[orderDateStr].revenue += order.grandTotal;
        dailySales[orderDateStr].orders += 1;
      }
    });

    // Orders by status
    let ordersByStatus = {};
    orders.forEach((order) => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Orders by payment method
    let ordersByPaymentMethod = {};
    orders.forEach((order) => {
      ordersByPaymentMethod[order.paymentMethod] =
        (ordersByPaymentMethod[order.paymentMethod] || 0) + 1;
    });

    // Payment status breakdown
    let ordersByPaymentStatus = {};
    orders.forEach((order) => {
      ordersByPaymentStatus[order.payment_status] =
        (ordersByPaymentStatus[order.payment_status] || 0) + 1;
    });

    // Calculate average order value
    let average_order_value =
      sales_count > 0 ? total_sales_amount / sales_count : 0;

    // Get revenue by payment status
    let revenueByPaymentStatus = {};
    orders.forEach((order) => {
      revenueByPaymentStatus[order.payment_status] =
        (revenueByPaymentStatus[order.payment_status] || 0) + order.grandTotal;
    });

    // Prepare data for the view
    let data = {
      type,
      date,
      start_date: start_date || "",
      end_date: end_date || "",
      month: month || "",
      year: year || "",
      start_date_formatted: startDate.toDateString(),
      end_date_formatted: endDate.toDateString(),
      sales_count,
      total_sales_amount,
      total_items_sold,
      average_order_value,
      dailySales: JSON.stringify(dailySales),
      ordersByStatus: JSON.stringify(ordersByStatus),
      ordersByPaymentMethod: JSON.stringify(ordersByPaymentMethod),
      ordersByPaymentStatus: JSON.stringify(ordersByPaymentStatus),
      revenueByPaymentStatus: JSON.stringify(revenueByPaymentStatus),
      topProducts: JSON.stringify(topProducts),
      topProductsByQuantity: JSON.stringify(topProductsByQuantity),
      orders: orders.slice(0, 10), // Get latest 10 orders for quick review
    };

    // Handle different output formats
    if (download === "pdf") {
      generatePDF(data, res);
    } else if (download === "excel") {
      generateExcel(data, res);
    } else {
      res.render("adminPages/SalesReportPages/adminSalesReport", data);
    }
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).send("Error generating sales report: " + error.message);
  }
};

function getDateRange(type, params) {
  let start_date, end_date;

  try {
    if (type === "daily") {
      if (!params.date) {
        // Default to today if no date provided
        params.date = new Date().toISOString().split("T")[0];
      }
      start_date = new Date(params.date);
      start_date.setHours(0, 0, 0, 0);
      end_date = new Date(params.date);
      end_date.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      if (!params.start_date) {
        // Default to start of current week if no date provided
        let today = new Date();
        let dayOfWeek = today.getDay();
        let startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        params.start_date = startOfWeek.toISOString().split("T")[0];
      }
      start_date = new Date(params.start_date);
      start_date.setHours(0, 0, 0, 0);
      end_date = new Date(params.start_date);
      end_date.setDate(end_date.getDate() + 6);
      end_date.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      let year = parseInt(params.year) || new Date().getFullYear();
      let month = params.month
        ? parseInt(params.month) - 1
        : new Date().getMonth();
      start_date = new Date(year, month, 1, 0, 0, 0, 0);
      end_date = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else if (type === "yearly") {
      let year = parseInt(params.year) || new Date().getFullYear();
      start_date = new Date(year, 0, 1, 0, 0, 0, 0);
      end_date = new Date(year, 11, 31, 23, 59, 59, 999);
    } else if (type === "custom") {
      if (!params.start_date || !params.end_date) {
        throw new Error("Start and end dates are required for custom reports");
      }
      start_date = new Date(params.start_date);
      start_date.setHours(0, 0, 0, 0);
      end_date = new Date(params.end_date);
      end_date.setHours(23, 59, 59, 999);
    } else {
      throw new Error("Invalid report type");
    }

    return { start_date, end_date };
  } catch (error) {
    console.error("Error calculating date range:", error);
    throw error;
  }
}

function generatePDF(data, res) {
  try {
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${Date.now()}.pdf`,
    );

    doc.pipe(res);

    // Header with company info
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Sales Report", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(
        `Period: ${data.start_date_formatted} to ${data.end_date_formatted}`,
        { align: "center" },
      );
    doc.moveDown(2);

    // Summary Statistics Section
    doc.fontSize(16).font("Helvetica-Bold").text("Summary Statistics");
    doc.moveDown(1);

    const summaryData = [
      ["Total Orders", data.sales_count.toString()],
      ["Total Revenue", `₹${data.total_sales_amount.toFixed(2)}`],
      ["Total Items Sold", data.total_items_sold.toString()],
      ["Average Order Value", `₹${data.average_order_value.toFixed(2)}`],
    ];

    // Draw summary table
    const startY = doc.y;
    const colWidth = 250;

    summaryData.forEach((row, index) => {
      const y = startY + index * 25;
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(row[0], 70, y, { width: colWidth });
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(row[1], 320, y, { width: colWidth });

      // Add subtle line
      doc
        .strokeColor("#EEEEEE")
        .lineWidth(0.5)
        .moveTo(70, y + 20)
        .lineTo(500, y + 20)
        .stroke();
    });

    doc.moveDown(4);

    // Order Status Breakdown
    const ordersByStatus = JSON.parse(data.ordersByStatus);
    if (Object.keys(ordersByStatus).length > 0) {
      doc.fontSize(16).font("Helvetica-Bold").text("Orders by Status");
      doc.moveDown(0.5);

      Object.entries(ordersByStatus).forEach(([status, count]) => {
        doc
          .fontSize(11)
          .font("Helvetica")
          .text(
            `${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} orders`,
            70,
          );
      });
      doc.moveDown(1.5);
    }

    // Payment Method Breakdown
    const ordersByPaymentMethod = JSON.parse(data.ordersByPaymentMethod);
    if (Object.keys(ordersByPaymentMethod).length > 0) {
      doc.fontSize(16).font("Helvetica-Bold").text("Payment Methods");
      doc.moveDown(0.5);

      Object.entries(ordersByPaymentMethod).forEach(([method, count]) => {
        doc
          .fontSize(11)
          .font("Helvetica")
          .text(`${method}: ${count} orders`, 70);
      });
      doc.moveDown(1.5);
    }

    // Top Products
    const topProducts = JSON.parse(data.topProducts);
    if (topProducts.length > 0) {
      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Top Products by Revenue");
      doc.moveDown(1);

      topProducts.slice(0, 5).forEach((product, index) => {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${index + 1}. ${product.name}`, 70);
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(
            `   Revenue: ₹${product.revenue.toFixed(2)} | Quantity Sold: ${product.quantity}`,
            70,
          );
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        {
          align: "center",
        },
      );

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF: " + error.message);
  }
}

function generateExcel(data, res) {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Admin Dashboard";
    wb.created = new Date();

    // Summary Sheet
    const summarySheet = wb.addWorksheet("Summary");

    // Title
    summarySheet.mergeCells("A1:D1");
    summarySheet.getCell("A1").value = "Sales Report";
    summarySheet.getCell("A1").font = { size: 18, bold: true };
    summarySheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    summarySheet.getRow(1).height = 30;

    // Date Range
    summarySheet.mergeCells("A2:D2");
    summarySheet.getCell("A2").value =
      `Period: ${data.start_date_formatted} to ${data.end_date_formatted}`;
    summarySheet.getCell("A2").alignment = { horizontal: "center" };
    summarySheet.getCell("A2").font = { size: 12 };

    // Summary Statistics
    summarySheet.addRow([]);
    summarySheet.addRow(["Summary Statistics"]);
    summarySheet.getCell("A4").font = { size: 14, bold: true };

    summarySheet.addRow([]);
    summarySheet.addRow(["Metric", "Value"]);
    summarySheet.getRow(6).font = { bold: true };

    summarySheet.addRow(["Total Orders", data.sales_count]);
    summarySheet.addRow(["Total Revenue", data.total_sales_amount]);
    summarySheet.addRow(["Total Items Sold", data.total_items_sold]);
    summarySheet.addRow(["Average Order Value", data.average_order_value]);

    // Format currency
    summarySheet.getCell("B8").numFmt = "₹#,##0.00";
    summarySheet.getCell("B10").numFmt = "₹#,##0.00";

    // Order Status
    const ordersByStatus = JSON.parse(data.ordersByStatus);
    summarySheet.addRow([]);
    summarySheet.addRow(["Order Status Breakdown"]);
    summarySheet.getCell(`A${summarySheet.lastRow.number}`).font = {
      size: 14,
      bold: true,
    };

    summarySheet.addRow([]);
    summarySheet.addRow(["Status", "Count"]);
    summarySheet.getRow(summarySheet.lastRow.number).font = { bold: true };

    Object.entries(ordersByStatus).forEach(([status, count]) => {
      summarySheet.addRow([
        status.charAt(0).toUpperCase() + status.slice(1),
        count,
      ]);
    });

    // Top Products Sheet
    const topProducts = JSON.parse(data.topProducts);
    if (topProducts.length > 0) {
      const productsSheet = wb.addWorksheet("Top Products");

      productsSheet.addRow(["Top Products by Revenue"]);
      productsSheet.getCell("A1").font = { size: 14, bold: true };

      productsSheet.addRow([]);
      productsSheet.addRow([
        "Rank",
        "Product Name",
        "Quantity Sold",
        "Revenue",
      ]);
      productsSheet.getRow(3).font = { bold: true };

      topProducts.forEach((product, index) => {
        productsSheet.addRow([
          index + 1,
          product.name,
          product.quantity,
          product.revenue,
        ]);
      });

      // Format revenue column
      for (let i = 4; i <= topProducts.length + 3; i++) {
        productsSheet.getCell(`D${i}`).numFmt = "₹#,##0.00";
      }

      // Auto-fit columns
      productsSheet.columns.forEach((column) => {
        column.width = 25;
      });
    }

    // Auto-fit summary sheet columns
    summarySheet.columns.forEach((column) => {
      column.width = 25;
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${Date.now()}.xlsx`,
    );

    wb.xlsx.write(res).then(() => {
      res.end();
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Error generating Excel: " + error.message);
  }
}

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
    } else {
      return res.status(400).json({ error: "Invalid period" });
    }

    const orders = await Order.find({
      orderDate: { $gte: startDate, $lt: endDate },
    })
      .populate("userId", "name email")
      .sort({ orderDate: -1 });

    const orderCount = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.grandTotal,
      0,
    );

    // Sales by day
    const salesByDay = {};
    orders.forEach((order) => {
      const dateStr = new Date(order.orderDate).toISOString().split("T")[0];
      salesByDay[dateStr] = (salesByDay[dateStr] || 0) + order.grandTotal;
    });

    const chartData = Object.keys(salesByDay)
      .map((date) => ({
        date,
        revenue: salesByDay[date],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        orderCount,
        totalRevenue,
        chartData,
        recentOrders: orders.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error fetching orders data:", error);
    res.status(500).json({ error: "Failed to fetch orders data" });
  }
};

exports.getSalesReportPage = async (req, res) => {
  try {
    res.render("adminPages/salesReport")
  } catch (error) {
    
  }
};
