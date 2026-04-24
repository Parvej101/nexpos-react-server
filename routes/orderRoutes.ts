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

    // ১. ডাটা স্যানিটাইজেশন (NaN এরর ঠেকানোর জন্য সবথেকে জরুরি)
    const cleanSubtotal = Number(subtotal) || 0;
    const cleanTotalPaid = Number(totalPaid) || 0;
    const cleanDue = Number(due) || 0;
    const cleanChange = Number(change) || 0;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty!" });
    }

    // ২. ইনভয়েস আইডি
    const count = await Order.countDocuments({ tenantId });
    const orderId = `INV-${1000 + count + 1}`;

    // ৩. স্টক আপডেট এবং আইটেম প্রসেস
    const processedItems = [];
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item._id, tenantId },
        { $inc: { stock: -Number(item.quantity || 0) } },
      );

      processedItems.push({
        productId: item._id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        total: (Number(item.price) || 0) * (Number(item.quantity) || 0),
      });
    }

    // ৪. নতুন অর্ডার তৈরি
    const newOrder = new Order({
      orderId,
      items: processedItems,
      subtotal: cleanSubtotal,
      tax: 0,
      discount: 0,
      total: cleanSubtotal, // আপনার মডেলে total required
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

    await newOrder.save();
    res.status(201).json({ message: "Order Placed Successfully!", orderId });
  } catch (error: any) {
    console.error("ORDER_SAVE_ERROR:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ২. সব অর্ডারের হিস্ট্রি দেখা (GET /api/orders/history)
router.get("/history", verifyToken, async (req: any, res: any) => {
  try {
    const orders = await Order.find({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 })
      .populate("creatorId", "name") // কে সেল করেছে তার নাম
      .populate("customerId", "name phone"); // কাস্টমারের নাম ও ফোন

    res.json(orders);
  } catch (error) {
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

export default router;
