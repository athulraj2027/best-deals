const Coupon = require("../models/Coupon");
const Product = require("../models/Product");

async function calculateCartTotal(
  cart,
  user,
  useWallet = false,
  paymentMethod,
) {
  let subtotal = 0;
  let couponDiscount = 0;
  let walletDeduction = 0;
  const items = [];

  // 1️⃣ Initial Subtotal
  for (let item of cart.items) {
    const itemSubtotal = Number(item.price) * Number(item.quantity);
    subtotal += itemSubtotal;
    items.push({
      cartItem: item,
      itemSubtotal,
      couponShare: 0,
      taxShare: 0,
      walletShare: 0,
    });
  }

  // 2️⃣ Coupon Calculation
  if (cart.appliedCoupon) {
    const coupon = await Coupon.findById(cart.appliedCoupon);
    if (coupon) {
      couponDiscount =
        coupon.discountType === "fixed"
          ? coupon.discountValue
          : (coupon.discountValue / 100) * subtotal;
    }
  }

  // 3️⃣ Tax Calculation (on discounted subtotal)
  const taxableAmount = subtotal - couponDiscount;
  const tax = taxableAmount * 0.1; // 10% Tax
  const grandTotalBeforeWallet = taxableAmount + tax;

  // 4️⃣ Wallet Logic
  if (useWallet || paymentMethod === "wallet") {
    walletDeduction = Math.min(user.wallet, grandTotalBeforeWallet);
  }

  const finalTotal = grandTotalBeforeWallet - walletDeduction;

  // 5️⃣ Distribute values across items
  items.forEach((item) => {
    const ratio = item.itemSubtotal / subtotal;

    item.couponShare = couponDiscount * ratio;
    item.taxShare = (item.itemSubtotal - item.couponShare) * 0.1;
    item.walletShare = walletDeduction * ratio;

    // paidAmount = (Item Price - Coupon + Tax) - Wallet
    // If you want to see what the user actually paid via COD/Razorpay:
    item.paidAmount =
      item.itemSubtotal - item.couponShare + item.taxShare - item.walletShare;

    // Safety check: ensure no negative values and fix decimals
    item.paidAmount = Math.max(0, parseFloat(item.paidAmount.toFixed(2)));
  });

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    couponDiscount: parseFloat(couponDiscount.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    walletDeduction: parseFloat(walletDeduction.toFixed(2)),
    finalTotal: parseFloat(finalTotal.toFixed(2)),
    items,
  };
}
module.exports = { calculateCartTotal };
