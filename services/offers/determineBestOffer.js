const Offer = require("../../models/Offer");
const Product = require("../../models/Product");

/**
 * Determine the best offer for a product
 */
async function determineBestOffer(product) {
  // Find all active offers that apply to this product
  const now = new Date();

  const offers = await Offer.find({
    $and: [
      { startDate: { $lte: now } },
      { endDate: { $gte: now } },
      { active: true },
      {
        $or: [
          { appliedProducts: product._id },
          { appliedCategories: product.category },
        ],
      },
    ],
  });

  if (offers.length === 0) {
    return null;
  }

  // Calculate discounts for each offer
  const offersWithDiscounts = offers.map((offer) => {
    let discountAmount = 0;
    let discountedPrice = product.price;

    if (offer.offerType === "percentage") {
      discountAmount = product.price * (offer.offerValue / 100);
      discountedPrice = product.price - discountAmount;
    } else if (offer.offerType === "fixed") {
      discountAmount = Math.min(offer.offerValue, product.price);
      discountedPrice = product.price - discountAmount;
    }

    return {
      offer_id: offer._id,
      name: offer.name,
      discount_type: offer.offerType,
      discount_value: offer.offerValue,
      discounted_price: parseFloat(discountedPrice.toFixed(2)),
      savings: parseFloat(discountAmount.toFixed(2)),
      valid_until: offer.endDate,
    };
  });

  // Find the offer with the highest discount
  return offersWithDiscounts.reduce((best, current) => {
    return current.savings > best.savings ? current : best;
  }, offersWithDiscounts[0]);
}

/**
 * Update best offers for all products
 */
async function updateAllProductOffers() {
  const products = await Product.find().populate("category");
  const bulkOps = [];

  for (const product of products) {
    const bestOffer = await determineBestOffer(product);

    bulkOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { best_offer: bestOffer } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  return bulkOps.length;
}

/**
 * Update offers for specific products affected by an offer
 */
async function updateProductsForOffer(offerId) {
  const offer = await Offer.findById(offerId);
  if (!offer) return 0;

  // Find products affected by this offer
  const productsQuery = {
    $or: [
      { _id: { $in: offer.appliedProducts } },
      { category: { $in: offer.appliedCategories } },
    ],
  };

  const products = await Product.find(productsQuery).populate("category");
  const bulkOps = [];

  for (const product of products) {
    const bestOffer = await determineBestOffer(product);
    if (!bestOffer) continue;

    const originalPrice = product.actualPrice;

    let discounted_price = 0;
    if (bestOffer.discount_type === "percentage") {
      discounted_price = originalPrice * (1 - bestOffer.discount_value / 100);
    } else {
      discounted_price = originalPrice - bestOffer.discount_value;
    }

    discounted_price = Math.max(discounted_price, 0);

    const newActualPrice = Math.min(originalPrice, discounted_price);
    const savings = originalPrice - newActualPrice;
    bestOffer.discounted_price = discounted_price;
    bestOffer.savings = savings;
     bulkOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            best_offer: bestOffer,
            actualPrice: newActualPrice,
          },
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  return bulkOps.length;
}

/**
 * Update offer statuses based on dates
 */
async function updateOfferStatuses() {
  const now = new Date();

  // Update expired offers
  await Offer.updateMany(
    { endDate: { $lt: now }, status: { $ne: "expired" } },
    { $set: { status: "expired", active: false } }
  );

  // Update active offers
  await Offer.updateMany(
    {
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: { $ne: "active" },
    },
    { $set: { status: "active" } }
  );

  // Update upcoming offers
  await Offer.updateMany(
    { startDate: { $gt: now }, status: { $ne: "upcoming" } },
    { $set: { status: "upcoming" } }
  );
}

module.exports = {
  determineBestOffer,
  updateAllProductOffers,
  updateProductsForOffer,
  updateOfferStatuses,
};
