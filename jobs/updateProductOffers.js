const cron = require("node-cron");
const {
  updateAllProductOffers,
  updateOfferStatuses,
} = require("../services/offers/determineBestOffer");

// Update all product offers every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled job: Update product offers");
  try {
    await updateOfferStatuses();
    const updatedCount = await updateAllProductOffers();
    console.log(`Updated offers for ${updatedCount} products`);
  } catch (error) {
    console.error("Error updating product offers:", error);
  }
});

// Quick update every hour to catch new offers or status changes
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly status update job");
  try {
    await updateOfferStatuses();
  } catch (error) {
    console.error("Error updating offer statuses:", error);
  }
});

// Initialize on startup
(async () => {
  try {
    await updateOfferStatuses();
    await updateAllProductOffers();
    console.log("Initial offer update completed");
  } catch (error) {
    console.error("Error during initial offer update:", error);
  }
})();
