import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Adjustment } from "../models/Adjustment.js";
import { Product } from "../models/Product.js";

const router = express.Router();

router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const { items, reason, note } = req.body;
    const tenantId = req.user.tenantId;

    // ১. সিরিয়াল আইডি জেনারেট
    const lastRecord = await Adjustment.findOne({ tenantId }).sort({
      adjustmentId: -1,
    });
    const nextId = lastRecord ? lastRecord.adjustmentId + 1 : 1;

    let totalValueChange = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) continue;

      const adjQty = Number(item.amount) || 0;
      const buyPrice = Number(product.purchasePrice) || 0;
      const itemValue = adjQty * buyPrice;

      const valueImpact = item.type === "addition" ? itemValue : -itemValue;
      totalValueChange += valueImpact;

      // স্টক আপডেট
      await Product.findByIdAndUpdate(item.id, {
        $inc: { stock: item.type === "addition" ? adjQty : -adjQty },
      });

      processedItems.push({
        productId: item.id,
        name: item.name,
        type: item.type,
        amount: adjQty,
        purchasePrice: buyPrice,
        itemTotalValue: itemValue,
      });
    }

    const newAdjustment = new Adjustment({
      adjustmentId: nextId,
      reason: reason || "Monthly Audit",
      note: note || "",
      items: processedItems,
      totalValueChange,
      tenantId,
      creatorId: req.user.id,
    });

    await newAdjustment.save();
    res.status(201).json({ message: "Stock Synced!", adjustmentId: nextId });
  } catch (error: any) {
    console.error("AUDIT_SAVE_ERROR:", error.message);
    res.status(500).json({ message: "Database Error", error: error.message });
  }
});
// একটি নির্দিষ্ট অডিটের বিস্তারিত দেখা (GET /api/adjustments/:id)
router.get("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const adjustment = await Adjustment.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    }).populate("creatorId", "name"); // কে অডিট করেছে তার নামও নিয়ে আসবে

    if (!adjustment)
      return res.status(404).json({ message: "Audit not found" });

    res.json(adjustment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching audit detail" });
  }
});

// একটি নির্দিষ্ট অডিটের বিস্তারিত দেখা (GET /api/adjustments/:id)
router.get("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId; // ইউজার যে দোকানের, শুধু সেই ডাটা দেখাবে

    // আইডি এবং টেন্যান্ট আইডি দিয়ে ডাটা খুঁজে বের করা
    const adjustment = await Adjustment.findOne({ _id: id, tenantId }).populate(
      "creatorId",
      "name email",
    ); // যে ইউজার অডিট করেছে তার নাম ও ইমেইল নিয়ে আসবে

    if (!adjustment) {
      return res.status(404).json({ message: "Audit record not found" });
    }

    res.json(adjustment);
  } catch (error: any) {
    console.error("GET_ADJUSTMENT_BY_ID_ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// সব হিস্ট্রি দেখার রাউট
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const data = await Adjustment.find({ tenantId: req.user.tenantId }).sort({
      createdAt: -1,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

export default router;
