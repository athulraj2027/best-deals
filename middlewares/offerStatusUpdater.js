const {updateOfferStatuses} = require('../services/offers/determineBestOffer')

const offerStatusUpdater = async (req, res, next) => {
  try {
    // Only update periodically to avoid excessive DB operations
    const lastUpdateTime = global.lastOfferStatusUpdate || 0;
    const now = Date.now();
    
    // Update status every 15 minutes at most
    if (now - lastUpdateTime > 15 * 60 * 1000) {
      await updateOfferStatuses();
      global.lastOfferStatusUpdate = now;
    }
    
    next();
  } catch (error) {
    console.error("Error updating offer statuses:", error);
    next();
  }
};

module.exports = offerStatusUpdater;
;