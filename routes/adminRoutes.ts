import bcrypt from "bcryptjs";
import express from "express";
import { authorize, verifyToken } from "../middleware/authMiddleware.js";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";

const router = express.Router();

// নতুন দোকান এবং মালিক তৈরি (SaaS Logic)
router.post(
  "/create-shop",
  verifyToken,
  authorize(["super_admin"]),
  async (req: any, res: any) => {
    try {
      const { shopName, ownerName, email, password } = req.body;

      // ১. চেক করা যে এই ইমেইল দিয়ে আগে কোনো ইউজার আছে কি না
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered!" });
      }

      // ২. প্রথমে দোকান (Tenant) তৈরি করা
      const newTenant = new Tenant({
        name: shopName,
        status: "active",
      });
      const savedTenant = await newTenant.save();

      // ৩. পাসওয়ার্ড এনক্রিপ্ট করা
      const hashedPassword = await bcrypt.hash(password, 10);

      // ৪. ওই দোকানের জন্য মালিক (Shop Owner) তৈরি করা
      const newOwner = new User({
        name: ownerName,
        email: email,
        password: hashedPassword,
        role: "shop_owner",
        tenantId: savedTenant._id, // নতুন দোকানের আইডি এখানে লিঙ্ক করা হলো
      });

      await newOwner.save();

      res.status(201).json({
        message: "Shop and Owner created successfully!",
        shopId: savedTenant._id,
      });
    } catch (error: any) {
      console.error("CREATE_SHOP_ERROR:", error.message);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  },
);

router.get(
  "/shops",
  verifyToken,
  authorize(["super_admin"]),
  async (req: any, res: any) => {
    try {
      // সব টেন্যান্ট (দোকান) খুঁজে বের করা
      const shops = await Tenant.find().sort({ createdAt: -1 });

      // প্রতিটি দোকানের মালিকের তথ্যসহ ডাটা সাজানো
      const result = await Promise.all(
        shops.map(async (shop) => {
          const owner = await User.findOne({
            tenantId: shop._id,
            role: "shop_owner",
          });
          return {
            _id: shop._id,
            shopName: shop.name,
            status: shop.status,
            createdAt: shop.createdAt,
            ownerName: owner?.name || "N/A",
            ownerEmail: owner?.email || "N/A",
          };
        }),
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shops" });
    }
  },
);

// ১. দোকানের তথ্য আপডেট করা (PATCH /api/admin/shops/:id)
router.patch(
  "/shops/:id",
  verifyToken,
  authorize(["super_admin"]),
  async (req: any, res: any) => {
    try {
      const { shopName, status } = req.body;
      const updatedShop = await Tenant.findByIdAndUpdate(
        req.params.id,
        { name: shopName, status },
        { returnDocument: "after" },
      );
      res.json(updatedShop);
    } catch (error) {
      res.status(500).json({ message: "Update failed" });
    }
  },
);

// ২. দোকান ডিঅ্যাক্টিভেট করা (নিরাপদ ডিলিট)
router.patch(
  "/shops/:id/deactivate",
  verifyToken,
  authorize(["super_admin"]),
  async (req: any, res: any) => {
    try {
      await Tenant.findByIdAndUpdate(req.params.id, { status: "inactive" });
      res.json({ message: "Shop deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate" });
    }
  },
);

// নির্দিষ্ট দোকানের সব ইউজার দেখা (GET /api/admin/shops/:id/users)
router.get(
  "/shops/:id/users",
  verifyToken,
  authorize(["super_admin"]),
  async (req: any, res: any) => {
    try {
      const users = await User.find({ tenantId: req.params.id }).select(
        "-password",
      );
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  },
);

export default router;
