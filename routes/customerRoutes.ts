import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Customer } from "../models/Customer.js";

const router = express.Router();

// ১. শুধু নিজের দোকানের সব কাস্টমার দেখা
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const customers = await Customer.find({ tenantId: req.user.tenantId }).sort(
      { createdAt: -1 },
    );
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers" });
  }
});

router.patch("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId }, // শুধু নিজের দোকানের কাস্টমার এডিট করা যাবে
      req.body,
      { new: true }, // আপডেট হওয়ার পর নতুন ডাটা রিটার্ন করবে
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ message: "Error updating customer" });
  }
});

// নাম অথবা ফোন দিয়ে কাস্টমার খোঁজা (GET /api/customers/search?q=...)
router.get("/search", verifyToken, async (req: any, res: any) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const customers = await Customer.find({
      tenantId: req.user.tenantId,
      $or: [
        { name: { $regex: query, $options: "i" } }, // i মানে case-insensitive
        { phone: { $regex: query, $options: "i" } },
      ],
    }).limit(5); // মাত্র ৫টি রেজাল্ট দেখাবে স্পিড ঠিক রাখতে

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Search failed" });
  }
});

// ২. নতুন কাস্টমার যোগ করা
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const customerData = { ...req.body, tenantId: req.user.tenantId };
    const newCustomer = new Customer(customerData);
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Customer with this phone already exists" });
    }
    res.status(500).json({ message: "Error adding customer" });
  }
});

export default router;
