// Enhanced version of the sales report controller with array parameter handling

const Order = require("../../models/Order");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

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
      params
    );

    // Ensure valid date range
    if (!startDate || !endDate) {
      return res.status(400).send("Invalid date range parameters");
    }

    console.log(
      `Using date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Get orders within date range
    let orders = await Order.find({
      orderDate: { $gte: startDate, $lt: endDate },
    }).sort({ orderDate: -1 });

    // Calculate metrics
    let sales_count = orders.length;
    let total_order_amount = orders.reduce(
      (sum, order) => sum + order.grantTotal,
      0
    );

    let total_original_total = 0;
    let total_item_price_total = 0;

    // Get top products
    let productSales = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        // Since originalPrice isn't in your model, calculate based on price
        const originalPrice = item.price; // You may need to adjust this logic
        total_original_total += originalPrice * item.quantity;
        total_item_price_total += item.price * item.quantity;

        // Track product sales
        const productKey = item.productId.toString();
        if (productSales[productKey]) {
          productSales[productKey].quantity += item.quantity;
          productSales[productKey].revenue += item.price * item.quantity;
        } else {
          productSales[productKey] = {
            name: item.name || "Unknown Product",
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          };
        }
      });
    });

    // Get top 5 products by revenue
    let topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    let item_level_discount_total =
      total_original_total - total_item_price_total;
    let order_level_discount_total =
      total_item_price_total - total_order_amount;
    let total_discount = item_level_discount_total + order_level_discount_total;

    // Daily sales for the period (for chart)
    let dailySales = {};
    let currentDate = new Date(startDate);

    // Initialize all dates in range
    while (currentDate < endDate) {
      let dateStr = currentDate.toISOString().split("T")[0];
      dailySales[dateStr] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in sales data
    orders.forEach((order) => {
      let orderDateStr = new Date(order.orderDate).toISOString().split("T")[0];
      if (dailySales[orderDateStr] !== undefined) {
        dailySales[orderDateStr] += order.grantTotal;
      }
    });

    // Orders by status
    let ordersByStatus = {};
    orders.forEach((order) => {
      if (ordersByStatus[order.status]) {
        ordersByStatus[order.status]++;
      } else {
        ordersByStatus[order.status] = 1;
      }
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
      total_order_amount,
      item_level_discount_total,
      order_level_discount_total,
      total_discount,
      dailySales: JSON.stringify(dailySales),
      ordersByStatus: JSON.stringify(ordersByStatus),
      topProducts: JSON.stringify(topProducts),
      orders: orders.slice(0, 10), // Get latest 10 orders for quick review
    };

    // Handle different output formats
    if (download === "pdf") {
      generatePDF(data, res);
    } else if (download === "excel") {
      generateExcel(data, res);
    } else {
      res.render("admin/sales_report", data);
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
      end_date = new Date(params.date);
      end_date.setDate(end_date.getDate() + 1);
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
      end_date = new Date(params.start_date);
      end_date.setDate(end_date.getDate() + 7);
    } else if (type === "monthly") {
      let year = parseInt(params.year) || new Date().getFullYear();
      let month = params.month
        ? parseInt(params.month) - 1
        : new Date().getMonth(); // 0-based
      start_date = new Date(year, month, 1);
      end_date = new Date(year, month + 1, 1);
    } else if (type === "yearly") {
      let year = parseInt(params.year) || new Date().getFullYear();
      start_date = new Date(year, 0, 1);
      end_date = new Date(year + 1, 0, 1);
    } else if (type === "custom") {
      if (!params.start_date || !params.end_date) {
        throw new Error("Start and end dates are required for custom reports");
      }
      start_date = new Date(params.start_date);
      end_date = new Date(params.end_date);
      // Add one day to include the full end date
      end_date.setDate(end_date.getDate() + 1);
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
    // Create PDF document
    let doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${Date.now()}.pdf`
    );

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to PDF

    // Header
    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown();

    // Date range
    doc
      .fontSize(12)
      .text(
        `Date Range: ${data.start_date_formatted} to ${data.end_date_formatted}`,
        { align: "center" }
      );
    doc.moveDown(2);

    // Summary statistics
    doc.fontSize(16).text("Summary Statistics");
    doc.moveDown();

    const summaryTable = {
      headers: ["Metric", "Value"],
      rows: [
        ["Sales Count", data.sales_count],
        ["Total Order Amount", `$${data.total_order_amount.toFixed(2)}`],
        ["Product Discounts", `$${data.item_level_discount_total.toFixed(2)}`],
        ["Coupon Discounts", `$${data.order_level_discount_total.toFixed(2)}`],
        ["Total Discounts", `$${data.total_discount.toFixed(2)}`],
      ],
    };

    // Calculate column widths for summary table
    const pageWidth = doc.page.width - 100;
    const columnWidth = pageWidth / summaryTable.headers.length;

    // Draw table headers
    doc.fontSize(12).font("Helvetica-Bold");
    summaryTable.headers.forEach((header, i) => {
      doc.text(header, 50 + i * columnWidth, doc.y, {
        width: columnWidth,
        align: "left",
      });
    });
    doc.moveDown();

    // Draw table rows
    doc.font("Helvetica");
    summaryTable.rows.forEach((row) => {
      doc.y += 5;
      row.forEach((cell, i) => {
        doc.text(cell, 50 + i * columnWidth, doc.y, {
          width: columnWidth,
          align: "left",
        });
      });
      doc.y += 15;
    });

    doc.moveDown(2);

    // Footer
    doc
      .fontSize(10)
      .text(`Report generated on ${new Date().toLocaleString()}`, {
        align: "center",
      });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF: " + error.message);
  }
}

function generateExcel(data, res) {
  try {
    // Create workbook
    let wb = new ExcelJS.Workbook();
    wb.creator = "Admin Dashboard";
    wb.created = new Date();

    // Add report sheet
    let sheet = wb.addWorksheet("Sales Report");

    // Add title
    sheet.mergeCells("A1:C1");
    sheet.getCell("A1").value = "Sales Report";
    sheet.getCell("A1").font = { size: 16, bold: true };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    // Add date range
    sheet.mergeCells("A2:C2");
    sheet.getCell("A2").value =
      `Date Range: ${data.start_date_formatted} to ${data.end_date_formatted}`;
    sheet.getCell("A2").alignment = { horizontal: "center" };

    // Add summary data
    sheet.addRow([]);
    sheet.addRow(["Metric", "Value"]);
    sheet.addRow(["Sales Count", data.sales_count]);
    sheet.addRow(["Total Order Amount", data.total_order_amount]);
    sheet.addRow(["Product Discounts", data.item_level_discount_total]);
    sheet.addRow(["Coupon Discounts", data.order_level_discount_total]);
    sheet.addRow(["Total Discounts", data.total_discount]);

    // Format the cells
    const headerRow = sheet.getRow(4);
    headerRow.font = { bold: true };

    // Add borders to the table
    for (let i = 4; i <= 9; i++) {
      const row = sheet.getRow(i);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 2) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      });
    }

    // Format currency cells
    ["B6", "B7", "B8", "B9"].forEach((cell) => {
      sheet.getCell(cell).numFmt = '"$"#,##0.00';
    });

    // Adjust column widths
    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Add timestamp
    sheet.addRow([]);
    sheet.addRow([`Report generated on ${new Date().toLocaleString()}`]);

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales_report_${Date.now()}.xlsx`
    );

    // Write to response
    wb.xlsx.write(res).then(() => {
      res.end();
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Error generating Excel: " + error.message);
  }
}

// Handle getting detailed order data for dashboard
exports.getOrdersData = async (req, res) => {
  try {
    const { period = "week" } = req.query;

    let startDate,
      endDate = new Date();

    // Calculate start date based on period
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

    // Get orders within time period
    const orders = await Order.find({
      orderDate: { $gte: startDate, $lt: endDate },
    }).sort({ orderDate: -1 });

    // Calculate metrics
    const orderCount = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.grantTotal,
      0
    );

    // Get sales by day for chart
    const salesByDay = {};
    orders.forEach((order) => {
      const dateStr = new Date(order.orderDate).toISOString().split("T")[0];
      salesByDay[dateStr] = (salesByDay[dateStr] || 0) + order.grantTotal;
    });

    // Format for chart
    const chartData = Object.keys(salesByDay)
      .map((date) => ({
        date,
        revenue: salesByDay[date],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return data
    res.json({
      success: true,
      data: {
        orderCount,
        totalRevenue,
        chartData,
        recentOrders: orders.slice(0, 5), // Get latest 5 orders
      },
    });
  } catch (error) {
    console.error("Error fetching orders data:", error);
    res.status(500).json({ error: "Failed to fetch orders data" });
  }
};
