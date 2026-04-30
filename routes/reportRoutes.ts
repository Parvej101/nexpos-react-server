import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";

const router = express.Router();

// ১. সেলস রিপোর্ট সামারি (Sales Report)
router.get("/sales-summary", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

    const stats = await Order.aggregate([
      {
        $match: {
          tenantId,
          createdAt: {
            $gte: new Date(start as string),
            $lte: new Date(new Date(end as string).setHours(23, 59, 59)),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          totalPaid: { $sum: "$totalPaid" },
          totalDue: { $sum: "$dueAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(
      stats[0] || { totalSales: 0, totalPaid: 0, totalDue: 0, count: 0 },
    );
  } catch (error) {
    res.status(500).json({ message: "Sales summary failed" });
  }
});

// ২. পারচেজ রিপোর্ট সামারি (Purchase Report)
router.get("/purchase-summary", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

    const stats = await Purchase.aggregate([
      {
        $match: {
          tenantId,
          date: {
            $gte: new Date(start as string),
            $lte: new Date(new Date(end as string).setHours(23, 59, 59)),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(stats[0] || { totalPurchase: 0, totalPaid: 0, count: 0 });
  } catch (error) {
    res.status(500).json({ message: "Purchase summary failed" });
  }
});

// ৩. আইটেম অনুযায়ী বিক্রির রিপোর্ট (Sales Item Report)
router.get("/sales-items", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

    const report = await Order.aggregate([
      {
        $match: {
          tenantId,
          createdAt: {
            $gte: new Date(start as string),
            $lte: new Date(new Date(end as string).setHours(23, 59, 59)),
          },
        },
      },
      { $unwind: "$items" }, // অর্ডার থেকে প্রতিটি আইটেমকে আলাদা রো করা
      {
        $lookup: {
          // কাস্টমার ডাটা আনা
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $project: {
          _id: "$_id", // মেইন অর্ডার আইডি (ডিটেইলে যাওয়ার জন্য)
          orderId: "$orderId",
          date: "$createdAt",
          customerName: {
            $ifNull: [{ $arrayElemAt: ["$customer.name", 0] }, "Walk-in"],
          },
          itemName: "$items.name",
          category: "$items.category", // যদি মডেলে থাকে
          quantity: "$items.quantity",
          price: "$items.price",
          total: "$items.total",
        },
      },
      { $sort: { date: -1 } },
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Item report failed" });
  }
});

// ৪. ইনভেন্টরি বা স্টক রিপোর্ট (Stock Report)
router.get("/stock-status", verifyToken, async (req: any, res: any) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

    const stockStats = await Product.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          // স্টক এবং কেনা দাম গুণ করে মোট ভ্যালু বের করা
          totalStockValue: {
            $sum: { $multiply: ["$stock", "$purchasePrice"] },
          },
          lowStockItems: {
            $sum: { $cond: [{ $lte: ["$stock", "$alertQty"] }, 1, 0] },
          },
        },
      },
    ]);

    // যদি ডাটাবেস একদম খালি থাকে তবে ডিফল্ট জিরো পাঠাবে
    res.json(
      stockStats[0] || { totalItems: 0, totalStockValue: 0, lowStockItems: 0 },
    );
  } catch (error) {
    res.status(500).json({ message: "Stock report failed" });
  }
});

export default router;
