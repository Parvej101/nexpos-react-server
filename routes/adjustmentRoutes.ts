import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Adjustment } from "../models/Adjustment.js";
import { Product } from "../models/Product.js";

const router = express.Router();

router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const { items, reason, note } = req.body;
    const tenantId = req.user.tenantId;

    // ১. আগে সব আইটেম চেক করে নেওয়া (যাতে অর্ধেক সেভ হয়ে পরে এরর না দেয়)
    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) continue;

      const adjQty = Number(item.amount) || 0;
      if (item.type === "subtraction" && product.stock < adjQty) {
        // যদি বিয়োগ করার পরিমাণ বর্তমান স্টকের চেয়ে বেশি হয়
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Current: ${product.stock}, trying to subtract: ${adjQty}`,
        });
      }
    }

    // ২. সিরিয়াল আইডি জেনারেট
    const lastRecord = await Adjustment.findOne({ tenantId }).sort({
      adjustmentId: -1,
    });
    const nextId = lastRecord ? lastRecord.adjustmentId + 1 : 1;

    let totalValueChange = 0;
    const processedItems = [];

    // ৩. এবার স্টক আপডেট এবং প্রসেসিং শুরু
    for (const item of items) {
      const product = await Product.findById(item.id);
      if (!product) continue;

      const adjQty = Number(item.amount) || 0;
      const buyPrice = Number(product.purchasePrice) || 0;
      const previousStock = product.stock;

      const change = item.type === "addition" ? adjQty : -adjQty;
      const newStock = previousStock + change;

      // আর্থিক হিসাব
      totalValueChange +=
        adjQty * buyPrice * (item.type === "addition" ? 1 : -1);

      // মেইন প্রোডাক্টের স্টক আপডেট (এখানে আর নেগেটিভ হওয়ার ভয় নেই)
      await Product.findByIdAndUpdate(item.id, { $set: { stock: newStock } });

      processedItems.push({
        productId: item.id,
        name: item.name,
        type: item.type,
        amount: adjQty,
        previousStock,
        newStock,
        purchasePrice: buyPrice,
        itemTotalValue: adjQty * buyPrice,
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
    res.status(500).json({ message: error.message });
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
