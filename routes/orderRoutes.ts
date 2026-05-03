import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

const router = express.Router();

// ১. নতুন সেল/অর্ডার তৈরি করা (POST /api/orders/create)
router.post("/create", verifyToken, async (req: any, res: any) => {
  try {
    const { items, subtotal, payments, totalPaid, due, change, customerId } =
      req.body;
    const tenantId = req.user.tenantId;
    const creatorId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty!" });
    }

    // --- ধাপ ১: স্টক ভ্যালিডেশন (সবথেকে গুরুত্বপূর্ণ) ---
    // আমরা প্রথমে চেক করব সব আইটেমের পর্যাপ্ত স্টক আছে কি না
    for (const item of items) {
      const product = await Product.findOne({ _id: item._id, tenantId });

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product "${item.name}" not found in inventory!` });
      }

      if (product.stock < Number(item.quantity)) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }
    }

    // --- ধাপ ২: ডাটা স্যানিটাইজেশন ---
    const cleanSubtotal = Number(subtotal) || 0;
    const cleanTotalPaid = Number(totalPaid) || 0;
    const cleanDue = Number(due) || 0;
    const cleanChange = Number(change) || 0;

    // --- ধাপ ৩: ইনভয়েস আইডি জেনারেট করা ---
    const count = await Order.countDocuments({ tenantId });
    const orderId = `INV-${1000 + count + 1}`;

    // --- ধাপ ৪: স্টক আপডেট এবং আইটেম প্রসেস ---
    const processedItems = [];
    for (const item of items) {
      // স্টক কমানো
      await Product.findOneAndUpdate(
        { _id: item._id, tenantId },
        { $inc: { stock: -Number(item.quantity) } },
      );

      processedItems.push({
        productId: item._id,
        name: item.name,
        category: item.category,
        price: Number(item.price),
        quantity: Number(item.quantity),
        total: Number(item.price * item.quantity),
      });
    }

    // --- ধাপ ৫: নতুন অর্ডার অবজেক্ট তৈরি ---
    const newOrder = new Order({
      orderId,
      items: processedItems,
      subtotal: cleanSubtotal,
      tax: 0,
      discount: 0,
      total: cleanSubtotal,
      totalPaid: cleanTotalPaid,
      dueAmount: cleanDue,
      changeAmount: cleanChange,
      payments: {
        cash: Number(payments?.cash) || 0,
        card: Number(payments?.card) || 0,
        bkash: Number(payments?.bkash) || 0,
        nagad: Number(payments?.nagad) || 0,
        bank: Number(payments?.bank) || 0,
      },
      paymentMethod: "Mixed",
      status: cleanDue > 0 ? "pending" : "completed",
      customerId: customerId && customerId !== "" ? customerId : null,
      tenantId,
      creatorId,
    });

    const savedOrder = await newOrder.save();

    // প্রিন্টের জন্য ডাটা পপুলেট করা
    const fullOrderData = await Order.findById(savedOrder._id)
      .populate("customerId", "name phone email")
      .populate("creatorId", "name");

    res.status(201).json({
      message: "Order Placed Successfully!",
      order: fullOrderData,
    });
  } catch (error: any) {
    console.error("ORDER_SAVE_ERROR:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

// ২. সব অর্ডারের হিস্ট্রি দেখা (GET /api/orders/history)
router.get("/history", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end } = req.query; // ফ্রন্টেন্ড থেকে পাঠানো তারিখ ধরবে
    const tenantId = req.user.tenantId;

    let query: any = { tenantId };

    // যদি তারিখ পাঠানো হয়, তবে শুধু ওই নির্দিষ্ট সময়ের ডাটা ফিল্টার করবে
    if (start && end) {
      query.createdAt = {
        $gte: new Date(start), // শুরুর তারিখ থেকে
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999)), // শেষ তারিখের শেষ সেকেন্ড পর্যন্ত
      };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("customerId", "name phone");

    res.json(orders);
  } catch (error: any) {
    console.error("HISTORY_ERROR:", error.message);
    res.status(500).json({ message: "Error fetching history" });
  }
});

// ৩. একটি নির্দিষ্ট অর্ডারের বিস্তারিত দেখা (প্রিন্টের সময় লাগবে)
router.get("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("creatorId", "name")
      .populate("customerId");

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order detail" });
  }
});

// কাস্টমার ডিউ পেমেন্ট রেকর্ড করা (POST /api/orders/pay-due/:id)
router.post("/pay-due/:id", verifyToken, async (req: any, res: any) => {
  try {
    const { amount, method } = req.body;
    const tenantId = req.user.tenantId;

    const order = await Order.findOne({ _id: req.params.id, tenantId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // নতুন হিসাব
    const newPaidAmount = Number(order.totalPaid) + Number(amount);
    const newDueAmount = Number(order.total) - newPaidAmount;

    // পেমেন্ট মেথড আপডেট (যদি আগে Mixed না থাকে এবং নতুন মেথড আলাদা হয়)
    const newStatus = newDueAmount <= 0 ? "completed" : "pending";

    await Order.findByIdAndUpdate(req.params.id, {
      $set: {
        totalPaid: newPaidAmount,
        dueAmount: Math.max(0, newDueAmount),
        status: newStatus,
      },
      // পেমেন্ট হিস্ট্রিতে নতুন ট্রানজ্যাকশন যোগ করা (যদি মডেলে থাকে, না থাকলে শুধু উপরের গুলো হবে)
      $push: {
        paymentHistory: { amount, method, date: new Date() },
      },
    });

    res.json({ message: "Payment updated!", newDue: newDueAmount });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

export default router;
