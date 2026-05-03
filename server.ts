import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

// মিডলওয়্যার ইমপোর্ট
import { authorize, verifyToken } from "./middleware/authMiddleware.js";

// রাউট ইমপোর্টসমূহ
import adjustmentRoutes from "./routes/adjustmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import expensesRoutes from "./routes/expenseRoutes.js";
import imageKitRoutes from "./routes/imageKitRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// ১. পাবলিক রাউট (লগইন ছাড়াই এক্সেস পাবে)
// ---------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/imagekit", imageKitRoutes); // ইমেজ আপলোড অথেন্টিকেশন

// ---------------------------------------------------------
// ২. গ্লোবাল গেটকিপার (নিচের সব রাউটের জন্য লগইন বাধ্যতামূলক)
// ---------------------------------------------------------
app.use("/api", verifyToken);

// ---------------------------------------------------------
// ৩. জেনারেল রাউট (Cashier, Shop Owner, Super Admin সবাই পারবে)
// ---------------------------------------------------------
const allRoles = ["super_admin", "shop_owner", "cashier"];

app.use("/api/sales", authorize(allRoles), saleRoutes);
app.use("/api/orders", authorize(allRoles), orderRoutes);
app.use("/api/customers", authorize(allRoles), customerRoutes);
app.use("/api/categories", authorize(allRoles), categoryRoutes);
app.use("/api/expenses", authorize(allRoles), expensesRoutes);
app.use("/api/reports", authorize(allRoles), reportRoutes);
app.use("/api/products", authorize(allRoles), productRoutes);
app.use("/api/purchases", authorize(allRoles), purchaseRoutes);
app.use("/api/suppliers", authorize(allRoles), supplierRoutes);
// ---------------------------------------------------------
// ৪. ম্যানেজমেন্ট রাউট (ক্যাশিয়ার এগুলো করতে পারবে না)
// শুধু Super Admin এবং Shop Owner এক্সেস পাবে
// ---------------------------------------------------------
const managementRoles = ["super_admin", "shop_owner"];

app.use("/api/adjustments", authorize(managementRoles), adjustmentRoutes);
app.use("/api/users", authorize(managementRoles), userRoutes);

// ---------------------------------------------------------
// ৫. সুপার অ্যাডমিন স্পেশাল
// ---------------------------------------------------------
const superAdminOnly = ["super_admin"];

app.use("/api/admin", authorize(superAdminOnly), adminRoutes);

// ---------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI || "";
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected & Secured"))
  .catch((err) => console.error("❌ Connection Error:", err));

app.listen(PORT, () => {
  console.log(`🚀 NEXPOS Server running on port ${PORT}`);
});
