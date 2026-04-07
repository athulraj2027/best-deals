const Coupon = require("../models/Coupon");
const Product = require("../models/Product");

async function calculateCartTotal(
  cart,
  user,
  useWallet = false,
  paymentMethod,
) {
  let subtotal = 0;
  let offerDiscount = 0;
  let couponDiscount = 0;
  let walletDeduction = 0;
  let totalRealPrice = 0;
  const items = [];

  // 1️⃣ Calculate subtotal
  for (let item of cart.items) {
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    const itemSubtotal = price * quantity;

    subtotal += itemSubtotal;
    totalRealPrice += itemSubtotal;

    items.push({
      cartItem: item,
      itemSubtotal,
    });
  }

  let total = subtotal;

  // 2️⃣ Apply coupon
  if (cart.appliedCoupon) {
    const coupon = await Coupon.findById(cart.appliedCoupon);

    if (coupon) {
      if (coupon.discountType === "fixed") {
        couponDiscount = coupon.discountValue;
      } else if (coupon.discountType === "percentage") {
        couponDiscount = (coupon.discountValue / 100) * total;
      }

      total = Math.max(0, total - couponDiscount);
    }
  }

  // 3️⃣ Distribute coupon discount across items
  for (let item of items) {
    const ratio = item.itemSubtotal / subtotal;
    item.couponShare = couponDiscount * ratio;
  }

  if ((useWallet && user.wallet > 0) || paymentMethod === "wallet") {
    walletDeduction = Math.min(user.wallet, total);
    total -= walletDeduction;

    // ✅ Deduct from wallet
    user.wallet -= walletDeduction;

    // ✅ Add transaction
    user.walletTransactions.push({
      type: "debit",
      amount: walletDeduction,
      description: `Used for order `,
    });

    await user.save();
  }

  // 5️⃣ Tax
  const tax = totalRealPrice * 0.1;
  total += tax;

  // 6️⃣ Calculate final paid amount per item
  for (let item of items) {
    const afterCoupon = item.itemSubtotal - item.couponShare;

    const ratio = afterCoupon / (subtotal - couponDiscount || 1);
    const walletShare = walletDeduction * ratio;
    const taxShare = tax * ratio;

    item.paidAmount = afterCoupon + taxShare;
  }

  return {
    subtotal,
    offerDiscount,
    couponDiscount,
    walletDeduction,
    tax,
    finalTotal: total,
    items,
  };
}

module.exports = { calculateCartTotal };
