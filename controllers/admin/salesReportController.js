const Order = require("../../models/Order");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

exports.getSalesReport = async (req, res) => {
  let { type, date, start_date, end_date, month, year } = req.query;
  console.log("request body : ", req.query);
  let params = { date, start_date, end_date, month, year };
  let { start_date: startDate, end_date: endDate } = getDateRange(type, params);

  let orders = await Order.find({
    orderDate: { $gte: startDate, $lt: endDate },
  });
  let sales_count = orders.length;
  let total_order_amount = orders.reduce(
    (sum, order) => sum + order.grantTotal,
    0
  );
  let total_original_total = 0;
  let total_item_price_total = 0;
  orders.forEach((order) => {
    order.items.forEach((item) => {
      total_original_total += item.originalPrice * item.quantity;
      total_item_price_total += item.price * item.quantity;
    });
  });
  let item_level_discount_total = total_original_total - total_item_price_total;
  let order_level_discount_total = total_item_price_total - total_order_amount;
  let total_discount = item_level_discount_total + order_level_discount_total;

  let data = {
    start_date: startDate.toDateString(),
    end_date: endDate.toDateString(),
    sales_count,
    total_order_amount,
    item_level_discount_total,
    order_level_discount_total,
    total_discount,
  };

  if (req.query.download == "pdf") {
    generatePDF(data, res);
  } else if (req.query.download == "excel") {
    generateExcel(data, res);
  } else {
    res.render("sales_report", data);
  }
};

function getDateRange(type, params) {
  let start_date, end_date;
  if (type == "daily") {
    start_date = new Date(params.date);
    end_date = new Date(params.date);
    end_date.setDate(end_date.getDate() + 1);
  } else if (type == "weekly") {
    start_date = new Date(params.start_date);
    end_date = new Date(params.start_date);
    end_date.setDate(end_date.getDate() + 7);
  } else if (type == "monthly") {
    let year = parseInt(params.year);
    let month = parseInt(params.month) - 1; // 0-based
    start_date = new Date(year, month, 1);
    end_date = new Date(year, month + 1, 1);
  } else if (type == "yearly") {
    let year = parseInt(params.year);
    start_date = new Date(year, 0, 1);
    end_date = new Date(year + 1, 0, 1);
  } else if (type == "custom") {
    start_date = new Date(params.start_date);
    end_date = new Date(params.end_date);
    end_date.setDate(end_date.getDate() + 1);
  }
  return { start_date, end_date };
}

function generatePDF(data, res) {
  let doc = new PDFDocument();
  doc.text(
    `Sales Report\nDate Range: ${data.start_date} to ${data.end_date}\nSales Count: ${data.sales_count}\nTotal Order Amount: ${data.total_order_amount}\nTotal Discount from Products: ${data.item_level_discount_total}\nTotal Discount from Coupons: ${data.order_level_discount_total}\nTotal Discount: ${data.total_discount}`
  );
  doc.end();
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", "attachment; filename=sales_report.pdf");
  doc.pipe(res);
}

function generateExcel(data, res) {
  let wb = new ExcelJS.Workbook();
  let sheet = wb.addWorksheet("Sales Report");
  sheet.addRow(["Metric", "Value"]);
  sheet.addRow(["Sales Count", data.sales_count]);
  sheet.addRow(["Total Order Amount", data.total_order_amount]);
  sheet.addRow([
    "Total Discount from Products",
    data.item_level_discount_total,
  ]);
  sheet.addRow([
    "Total Discount from Coupons",
    data.order_level_discount_total,
  ]);
  sheet.addRow(["Total Discount", data.total_discount]);
  wb.xlsx.write(res).then(() => res.end());
  res.set("Content-Type", "application/octet-stream");
  res.set("Content-Disposition", "attachment; filename=sales_report.xlsx");
}
