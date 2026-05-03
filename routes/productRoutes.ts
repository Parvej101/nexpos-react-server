import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
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

// ৩. নতুন প্রোডাক্ট যোগ করা
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    // ১. নিশ্চিত করুন এখানে 'image' লেখা আছে
    const {
      name,
      barcode,
      price,
      purchasePrice,
      category,
      stock,
      unit,
      alertQty,
      image,
    } = req.body;
    const tenantId = req.user.tenantId;

    let finalBarcode = barcode?.trim();

    // অটো-বারকোড লজিক (আগের মতোই)
    if (!finalBarcode || finalBarcode === "") {
      const itProducts = await Product.find({
        tenantId,
        barcode: { $regex: /^IT\d+$/ },
      }).select("barcode");
      let maxNumber = 0;
      itProducts.forEach((p) => {
        const currentNum = parseInt(p.barcode.replace("IT", ""));
        if (!isNaN(currentNum) && currentNum > maxNumber)
          maxNumber = currentNum;
      });
      finalBarcode = `IT${maxNumber + 1}`;
    }

    // ২. নতুন প্রোডাক্ট অবজেক্ট তৈরি
    const newProduct = new Product({
      name,
      barcode: finalBarcode,
      category,
      price: Number(price) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      stock: Number(stock) || 0,
      unit: unit || "pcs",
      alertQty: Number(alertQty) || 5,
      image: image || "", // এটি নিশ্চিত করুন
      tenantId: tenantId,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
// ৪. প্রোডাক্ট আপডেট করা (সিকিউরিটি এখন server.ts থেকে হ্যান্ডেল হবে)
router.patch("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: "after" },
    );
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
});

// ৫. প্রোডাক্ট ডিলিট করা (সিকিউরিটি এখন server.ts থেকে হ্যান্ডেল হবে)
router.delete("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const deleted = await Product.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

export default router;
