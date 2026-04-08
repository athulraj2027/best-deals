const Offer = require("../../models/Offer");
const Product = require("../../models/Product");

async function determineBestOffer(product, variantPrice) {
  const now = new Date();

  const offers = await Offer.find({
    active: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    $or: [
      { appliedProducts: product._id },
      { appliedCategories: product.category },
    ],
  });

  if (!offers.length) return null;

  let bestOffer = null;
  let maxSavings = 0;

  for (let offer of offers) {
    let discountAmount = 0;

    if (offer.offerType === "percentage") {
      discountAmount = (variantPrice * offer.offerValue) / 100;
    } else {
      discountAmount = offer.offerValue;
    }

    discountAmount = Math.min(discountAmount, variantPrice);

    if (discountAmount > maxSavings) {
      maxSavings = discountAmount;

      bestOffer = {
        offer_id: offer._id,
        name: offer.name,
        discount_type: offer.offerType,
        discount_value: offer.offerValue,
        discounted_price: Number((variantPrice - discountAmount).toFixed(2)),
        savings: Number(discountAmount.toFixed(2)),
        valid_until: offer.expiryDate,
      };
    }
  }

  return bestOffer;
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
