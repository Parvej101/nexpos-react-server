import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Customer } from "../models/Customer.js";
import { Expense } from "../models/Expense.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { Supplier } from "../models/Supplier.js";

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

// dashboard stats
router.get("/dashboard-stats", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end } = req.query;
    const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

    // তারিখ ফিল্টার (শুরু থেকে শেষ দিন রাত ১১:৫৯ পর্যন্ত)
    const dateFilter = {
      tenantId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
      },
    };

    // ১. সেলস সামারি
    const sales = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          due: { $sum: "$dueAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // ২. পারচেজ সামারি (Purchase মডেলে 'date' ফিল্ড থাকলে সেটি ব্যবহার করুন)
    const purchases = await Purchase.aggregate([
      {
        $match: {
          tenantId,
          date: {
            $gte: new Date(start),
            $lte: new Date(new Date(end).setHours(23, 59, 59, 999)),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
          due: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } },
        },
      },
    ]);

    // ৩. এক্সপেন্স সামারি
    const expenses = await Expense.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // ৪. Flow Analytics (Revenue Stream Chart)
    const flow = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id:
            start === end
              ? { $hour: "$createdAt" }
              : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedFlow = flow.map((f) => {
      let label = f._id.toString();
      if (start === end) {
        const hr = f._id;
        label =
          hr >= 12
            ? `${hr === 12 ? 12 : hr - 12} PM`
            : `${hr === 0 ? 12 : hr} AM`;
      } else {
        label = new Date(f._id).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      return { label, amount: f.amount };
    });

    // ৫. Volume Split (Category Chart)
    const volume = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.category", "General"] },
          value: { $sum: "$items.total" },
        },
      },
      { $project: { name: "$_id", value: 1, _id: 0 } },
      { $sort: { value: -1 } },
    ]);

    // ৬. Lifetime Counts
    const [custs, supps, prods] = await Promise.all([
      Customer.countDocuments({ tenantId }),
      Supplier.countDocuments({ tenantId }),
      Product.countDocuments({ tenantId }),
    ]);

    res.json({
      financials: {
        salesTotal: sales[0]?.total || 0,
        salesDue: sales[0]?.due || 0,
        purchaseDue: purchases[0]?.due || 0,
        expenseTotal: expenses[0]?.total || 0,
        orderCount: sales[0]?.count || 0,
      },
      counts: { customers: custs, suppliers: supps, products: prods },
      flowAnalytics: formattedFlow,
      volumeSplit: volume,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
