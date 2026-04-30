import express from "express";
import { checkRole, verifyToken } from "../middleware/authMiddleware.js";
import { Product } from "../models/Product.js";

const router = express.Router();

// ১. সব প্রোডাক্ট দেখা (নিজের দোকানের)
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const products = await Product.find({ tenantId: req.user.tenantId }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ২. একটি প্রোডাক্ট দেখা
router.get("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product" });
  }
});

// ৩. প্রোডাক্ট যোগ করা (Admin/Manager পারবে)
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const { barcode } = req.body;
    const tenantId = req.user.tenantId;

    let finalBarcode = barcode;

    // ১. যদি ইউজার বারকোড না দেয় (খালি রাখে), তবে অটো-জেনারেট হবে
    if (!finalBarcode || finalBarcode.trim() === "") {
      // ওই দোকানের শেষ অটো-জেনারেটেড (IT দিয়ে শুরু) প্রোডাক্টটি খোঁজা
      const lastAutoProduct = await Product.findOne({
        tenantId,
        barcode: { $regex: /^IT/ }, // শুধু IT দিয়ে শুরু হওয়া বারকোড খুঁজবে
      }).sort({ createdAt: -1 });

      let nextNumber = 1;
      if (lastAutoProduct && lastAutoProduct.barcode) {
        const lastCodeNumber = parseInt(
          lastAutoProduct.barcode.replace("IT", ""),
        );
        if (!isNaN(lastCodeNumber)) {
          nextNumber = lastCodeNumber + 1;
        }
      }
      finalBarcode = `IT${nextNumber}`;
    }

    // ২. চেক করা যে এই বারকোডটি অলরেডি ডাটাবেসে আছে কি না (ইউনিকনেস চেক)
    const existingProduct = await Product.findOne({
      barcode: finalBarcode,
      tenantId,
    });
    if (existingProduct) {
      return res
        .status(400)
        .json({ message: "This Barcode/SKU already exists!" });
    }

    // ৩. নতুন প্রোডাক্ট তৈরি
    const newProduct = new Product({
      ...req.body,
      barcode: finalBarcode, // ইউজার দিলে সেটি, না দিলে অটো-জেনারেটেড
      tenantId: tenantId,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error("PRODUCT_ADD_ERROR:", error.message);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// ৪. প্রোডাক্ট আপডেট করা
router.patch(
  "/:id",
  verifyToken,
  checkRole(["admin", "manager"]),
  async (req: any, res: any) => {
    try {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId },
        req.body,
        { new: true },
      );
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Error updating product" });
    }
  },
);

// ৫. প্রোডাক্ট ডিলিট করা (শুধু Admin পারবে)
router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  async (req: any, res: any) => {
    try {
      const deleted = await Product.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });
      if (!deleted)
        return res.status(404).json({ message: "Product not found" });
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  },
);

export default router;
