import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { Supplier } from "../models/Supplier.js";

const router = express.Router();

// ১. লেজার সামারি (১ নম্বর ছবির জন্য)
router.get("/ledger", verifyToken, async (req: any, res: any) => {
  try {
    const tenantId = req.user.tenantId;

    // প্রতিটি সাপ্লায়ারের জন্য আলাদাভাবে হিসাব ক্যালকুলেট করা
    const summary = await Purchase.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: "$supplierId",
          totalPurchased: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // সাপ্লায়ারের নামসহ ডাটা পাঠানো
    const result = await Promise.all(
      summary.map(async (item) => {
        const supplier = await Supplier.findById(item._id);
        return {
          id: item._id,
          name: supplier?.name || "Unknown",
          totalPurchased: item.totalPurchased,
          totalPaid: item.totalPaid,
          totalDue: item.totalPurchased - item.totalPaid,
          orderCount: item.orderCount,
        };
      }),
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Summary error" });
  }
});

// ২. নির্দিষ্ট সাপ্লায়ারের ডিটেইলস (২ নম্বর ছবির জন্য)
router.get("/ledger/:id", verifyToken, async (req: any, res: any) => {
  try {
    const supplierId = req.params.id;
    const tenantId = req.user.tenantId;

    const supplier = await Supplier.findById(supplierId);
    const purchases = await Purchase.find({ supplierId, tenantId }).sort({
      date: -1,
    });

    // হিসাবগুলো যোগ করা
    let totalPurchased = 0;
    let totalPaid = 0;
    let allPayments: any[] = [];

    purchases.forEach((p) => {
      totalPurchased += p.totalAmount;
      totalPaid += p.paidAmount;
      // সব পেমেন্ট ট্রানজ্যাকশন এক জায়গায় করা (টাইমলাইনের জন্য)
      p.payments.forEach((pay) => {
        allPayments.push({ ...pay.toObject(), purchaseId: p.purchaseId });
      });
    });

    res.json({
      name: supplier?.name,
      totalPurchased,
      totalPaid,
      totalDue: totalPurchased - totalPaid,
      orderCount: purchases.length,
      purchases,
      payments: allPayments.sort((a, b) => b.date - a.date),
    });
  } catch (error) {
    res.status(500).json({ message: "Detail error" });
  }
});

// ৩. পেমেন্ট রেকর্ড করা (৩ নম্বর ছবির জন্য)
// ৩. একটি নির্দিষ্ট পারচেজ অর্ডারের পেমেন্ট রেকর্ড করা (POST /api/purchases/payment/:purchaseId)
router.post("/payment/:purchaseId", verifyToken, async (req: any, res: any) => {
  try {
    const { purchaseId } = req.params;
    const { amount, method, note } = req.body;
    const tenantId = req.user.tenantId;

    // ১. প্রথমে ওই পারচেজ রেকর্ডটি খুঁজে বের করা
    const purchase = await Purchase.findOne({ _id: purchaseId, tenantId });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // ২. নতুন পেইড অ্যামাউন্ট ক্যালকুলেট করা
    const newPaidAmount = Number(purchase.paidAmount) + Number(amount);

    // ৩. পেমেন্ট স্ট্যাটাস নির্ধারণ (Paid নাকি Partial)
    let status = "Partial";
    if (newPaidAmount >= purchase.totalAmount) {
      status = "Paid";
    } else if (newPaidAmount <= 0) {
      status = "Unpaid";
    }

    // ৪. পেমেন্ট হিস্ট্রিতে নতুন ট্রানজ্যাকশন যোগ করা
    const newPayment = {
      amount: Number(amount),
      method: method || "Cash",
      note: note || "",
      date: new Date(),
    };

    // ৫. ডাটাবেস আপডেট করা
    const updatedPurchase = await Purchase.findOneAndUpdate(
      { _id: purchaseId, tenantId },
      {
        $set: {
          paidAmount: newPaidAmount,
          paymentStatus: status,
        },
        $push: { payments: newPayment }, // টাইমলাইনের জন্য পুশ করা হলো
      },
      { returnDocument: "after" },
    );

    res.status(200).json({
      message: "Payment recorded successfully!",
      updatedPurchase,
    });
  } catch (error: any) {
    console.error("PAYMENT_RECORD_ERROR:", error.message);
    res.status(500).json({ message: "Failed to record payment" });
  }
});

// ৩. নতুন পারচেজ অর্ডার তৈরি
router.post("/create", verifyToken, async (req: any, res: any) => {
  try {
    const {
      items,
      supplierId,
      supplierName,
      totalAmount,
      paidAmount,
      paymentMethod,
      referenceNo,
      transactionId,
      date,
    } = req.body;
    const tenantId = req.user.tenantId;

    const count = await Purchase.countDocuments({ tenantId });
    const purchaseId = `PUR-${1000 + count + 1}`;

    // প্রতিটি আইটেমের জন্য লুপ চালিয়ে স্টক বাড়ানো
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item.productId, tenantId },
        { $inc: { stock: Number(item.quantity) } }, // মাল কেনায় স্টক বাড়বে (+)
      );
    }

    const newPurchase = new Purchase({
      purchaseId,
      supplierId,
      supplierName,
      date,
      referenceNo,
      items,
      totalAmount,
      paidAmount,
      paymentStatus:
        paidAmount >= totalAmount
          ? "Paid"
          : paidAmount > 0
            ? "Partial"
            : "Unpaid",
      payments:
        paidAmount > 0
          ? [{ amount: paidAmount, method: paymentMethod, transactionId }]
          : [],
      tenantId,
      creatorId: req.user.id,
    });

    await newPurchase.save();
    res
      .status(201)
      .json({ message: "Stock Updated Successfully!", purchaseId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ২. সব পারচেজ হিস্ট্রি দেখা
router.get("/history", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end, page = 1, limit = 10, q = "" } = req.query;
    const tenantId = req.user.tenantId;

    let query: any = { tenantId };

    // ১. স্মার্ট ফিল্টার: যদি তারিখ পাঠানো হয় তবেই ফিল্টার হবে
    // এবং তারিখগুলো যদি "undefined" বা "null" স্ট্রিং না হয়
    if (
      start &&
      end &&
      start !== "undefined" &&
      start !== "null" &&
      start !== ""
    ) {
      query.date = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
      };
    }

    // ২. সার্চ কুয়েরি (যদি থাকে)
    if (q) {
      query.$or = [
        { purchaseId: { $regex: q, $options: "i" } },
        { supplierName: { $regex: q, $options: "i" } },
      ];
    }

    const totalRecords = await Purchase.countDocuments(query);

    // ৩. সর্টিং এবং পেজিনেশন (সব সময় নতুন ডাটা আগে আসবে)
    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 }) // Newest First
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("creatorId", "name");

    res.json({
      data: purchases,
      totalPages: Math.ceil(totalRecords / Number(limit)),
      currentPage: Number(page),
      totalRecords,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// একটি নির্দিষ্ট পারচেজ ভাউচারের বিস্তারিত দেখা
router.get("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("supplierId", "name phone email") // সাপ্লায়ার ডিটেইলস
      .populate("creatorId", "name"); // কে ভাউচারটি তৈরি করেছে

    if (!purchase)
      return res.status(404).json({ message: "Voucher not found" });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
