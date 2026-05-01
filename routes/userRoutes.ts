import bcrypt from "bcryptjs";
import express from "express";
import { authorize, verifyToken } from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";

// ১. এটি অত্যন্ত জরুরি: নিজের একটি রাউট তৈরি করুন
const router = express.Router();

// নতুন ক্যাশিয়ার তৈরি (Shop Owner এর জন্য)
router.post(
  "/create-cashier",
  verifyToken,
  authorize(["shop_owner", "super_admin"]),
  async (req: any, res: any) => {
    try {
      const { name, email, password } = req.body;

      // ইমেইল চেক
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "Email already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      const newCashier = new User({
        name,
        email,
        password: hashedPassword,
        role: "cashier",
        tenantId: req.user.tenantId, // মালিকের দোকানের আইডি অটোমেটিক সেট হবে
      });

      await newCashier.save();
      res.status(201).json({ message: "Cashier account created!" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create cashier" });
    }
  },
);

export default router;
