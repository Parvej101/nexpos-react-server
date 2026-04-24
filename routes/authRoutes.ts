import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { Tenant } from "../models/Tenant.js"; // Tenant মডেলটি ইমপোর্ট করুন
import { User } from "../models/User.js";

const router = express.Router();

// ১. নতুন দোকান এবং অ্যাডমিন ইউজার তৈরি করা (Register Shop)
router.post("/register-shop", async (req: any, res: any) => {
  try {
    const { shopName, adminName, email, password } = req.body;

    // ইমেইল আগে থেকেই আছে কি না চেক করা
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // প্রথমে নতুন দোকান (Tenant) তৈরি করা
    const newShop = new Tenant({ name: shopName });
    const savedShop = await newShop.save();

    // পাসওয়ার্ড এনক্রিপ্ট (Hash) করা
    const hashedPassword = await bcrypt.hash(password, 10);

    // ওই দোকানের আন্ডারে অ্যাডমিন ইউজার তৈরি করা
    const newUser = new User({
      name: adminName,
      email,
      password: hashedPassword,
      role: "admin",
      tenantId: savedShop._id, // দোকানের আইডি ইউজারের সাথে কানেক্ট হলো
    });

    await newUser.save();
    res.status(201).json({
      message: "Shop and Admin created successfully!",
      shopId: savedShop._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ২. লগইন লজিক (Login)
router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    // ইউজার খুঁজে বের করা
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // পাসওয়ার্ড চেক করা
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // সিকিউর টোকেন (JWT) তৈরি করা
    const token = jwt.sign(
      { id: user._id, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "1d" },
    );

    // সাকসেস মেসেজ এবং টোকেন পাঠানো
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
