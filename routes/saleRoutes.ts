import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Order } from "../models/Order.js";

const router = express.Router();

router.post("/create", verifyToken, async (req: any, res) => {
  try {
    const saleData = {
      ...req.body,
      tenantId: req.user.tenantId, // অটোমেটিক দোকানের আইডি সেট হবে
      creatorId: req.user.id, // কে সেলটি করেছে তার আইডি
    };
    const newOrder = new Order(saleData);
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: "Sale failed" });
  }
});

export default router;
