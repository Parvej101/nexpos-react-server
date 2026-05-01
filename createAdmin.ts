import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Tenant } from "./models/Tenant.js";
import { User } from "./models/User.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // ১. ডাটাবেস কানেক্ট করা
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to DB...");

    // ২. একটি মাস্টার দোকান (Tenant) তৈরি করা (যেহেতু ইউজারদের টেন্যান্ট আইডি লাগে)
    let masterTenant = await Tenant.findOne({ name: "Master Shop" });
    if (!masterTenant) {
      masterTenant = new Tenant({ name: "Master Shop", status: "active" });
      await masterTenant.save();
    }

    // ৩. পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash("45374513", 10);

    // ৪. সুপার অ্যাডমিন তৈরি করা
    const admin = new User({
      name: "MH Parvej",
      email: "parvej@gmail.com",
      password: hashedPassword,
      role: "super_admin",
      tenantId: masterTenant._id,
    });

    await admin.save();
    console.log("✅ Super Admin created successfully!");
    console.log("Email: parvej@gmail.com | Pass: 45374513");

    process.exit();
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();
