const Order = require("../../models/Order");

exports.getOrdersPage = async (req, res) => {
  try {
    
    // Helper functions 

    res.locals.getStatusBadgeClass = (status) => {
      switch(status) {
        case 'pending': return 'bg-warning';
        case 'processing': return 'bg-info';
        case 'delivered': return 'bg-success';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
      }
    };
    
    res.locals.getPaymentStatusBadgeClass = (status) => {
      switch(status) {
        case 'pending': return 'bg-warning';
        case 'paid': return 'bg-success';
        case 'refunded': return 'bg-info';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
      }
    };

    const orders = await Order.find()

    return res.status(200).render('adminPages/OrderPages/adminOrders',{orders})
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      title: "Error",
      message: "Server error",
    });
  }
};
