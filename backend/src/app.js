import express from "express";
import cors from "cors";
import mandiRoutes from "./modules/mandi/mandi.routes.js";
import authRoutes from "../routes/auth.routes.js";
import verificationRoutes from "../routes/verification.routes.js";
import lotRoutes from "../routes/lot.routes.js";
import buyerRoutes from "../routes/buyer.routes.js";
import buyerDemandRoutes from "../routes/buyerDemand.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import marketNewsRoutes from "../routes/marketNews.routes.js";
import purchaseRequestRoutes from "../routes/purchaseRequest.routes.js";
import offerRoutes from "../routes/offer.routes.js";
import logisticsRoutes from "../routes/logistics.routes.js";
import orderRoutes from "../routes/order.routes.js";
import grievanceRoutes from "../routes/grievance.routes.js";



const app = express();

// MIDDLEWARE

app.use(cors());
app.use(express.json());

// AUTH ROUTES
app.use("/api/mandi-prices", mandiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/buyers", buyerRoutes);
app.use("/api/buyer-demands", buyerDemandRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/market-news", marketNewsRoutes);
app.use("/api/purchase-requests", purchaseRequestRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/logistics", logisticsRoutes);
app.use("/api/grievances", grievanceRoutes);

// NORMALIZE MANDI DATA

// Government API uses:
// min_price, max_price, modal_price, arrival_date
//
// Frontend uses:
// minPrice, maxPrice, modalPrice, arrivalDate
//
// This function converts Government API data
// into the format already expected by frontend.


const cropImageCache = new Map();
// CLEAN CROP NAME

function cleanCropName(crop) {
  return String(crop || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ========================================
// LOCAL CROP IMAGE MAP
// ========================================
// IMPORTANT:
// These paths point to images available from
// your frontend public/images/crops folder.
//
// No random Wikimedia image is used.

function getLocalCropImage(crop) {
  const name = cleanCropName(crop);

  const imageMap = {
    // Cereals
    wheat: "/images/crops/wheat.jpg",

    rice: "/images/crops/rice.jpg",
    paddy: "/images/crops/rice.jpg",

    maize: "/images/crops/maize.jpg",
    corn: "/images/crops/maize.jpg",

    // Pulses
    chickpea: "/images/crops/chickpea.jpg",
    gram: "/images/crops/chickpea.jpg",
    "bengal gram": "/images/crops/chickpea.jpg",

    // Vegetables
    tomato: "/images/crops/tomato.jpg",

    cauliflower: "/images/crops/cauliflower.jpg",

    ashgourd: "/images/crops/ashgourd.jpg",

    cucumber: "/images/crops/cucumber.jpg",
    kheera: "/images/crops/cucumber.jpg",

    "cluster beans": "/images/crops/cluster-beans.jpg",

    "green avare": "/images/crops/green-avare.jpg",
    "green avare w": "/images/crops/green-avare.jpg",

    // Fruits
    banana: "/images/crops/banana.jpg",

    lemon: "/images/crops/lemon.jpg",

    // Others
    cotton: "/images/crops/cotton.jpg",

    turmeric: "/images/crops/turmeric.jpeg",

    drumstick: "/images/crops/drumstick.jpg",
    moringa: "/images/crops/drumstick.jpg",
  };

  for (const [key, image] of Object.entries(imageMap)) {
    if (name.includes(key)) {
      return image;
    }
  }

  // Unknown crop
  return "/images/crops/default.jpg";
}

// ========================================
// CROP IMAGE API
// ========================================

app.get("/api/crop-image", async (req, res) => {
  try {
    const crop = String(req.query.crop || "").trim();

    // Validate crop name
    if (!crop) {
      return res.status(400).json({
        success: false,
        message: "Crop name is required",
      });
    }

    const cacheKey = cleanCropName(crop); 
    // RETURN CACHED IMAGE
 

    if (cropImageCache.has(cacheKey)) {
      return res.json({
        success: true,
        crop,
        image: cropImageCache.get(cacheKey),
        source: "cache",
      });
    }
    // LOCAL IMAGE ONLY
    const localImage = getLocalCropImage(crop);

    cropImageCache.set(cacheKey, localImage);
    // RETURN LOCAL / DEFAULT IMAGE
    if (localImage !== "/images/crops/default.jpg") {
      return res.json({
        success: true,
        crop,
        image: localImage,
        source: "local",
      });
    }
    // UNKNOWN CROP
    return res.json({
      success: true,
      crop,
      image: "/images/crops/default.jpg",
      source: "fallback",
    });
  } catch (error) {
    console.error("âŒ Crop image error:", error);

    return res.json({
      success: true,
      crop: req.query.crop || "",
      image: "/images/crops/default.jpg",
      source: "fallback",
    });
  }
});

// HOME / HEALTH
app.get("/", (req, res) => {
  res.json({
    message: "Bharat Fasal API is running ðŸŒ¾",
  });
});

// CENTRAL ERROR HANDLER
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error("API error:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message: error.isOperational
      ? error.message
      : "Internal server error",
  });
});
export default app;