import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Category } from "../models/Category.js";

const router = express.Router();

// ১. নিজের দোকানের সব ক্যাটাগরি দেখা (GET /api/categories)
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const categories = await Category.find({
      tenantId: req.user.tenantId,
    }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
});

// ২. নতুন ক্যাটাগরি যোগ করা (POST /api/categories/add)
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const { name, description } = req.body;

    const newCategory = new Category({
      name,
      description,
      tenantId: req.user.tenantId,
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category name already exists" });
    }
    res.status(500).json({ message: "Error adding category" });
  }
});

// ৩. ক্যাটাগরি আপডেট করা (PATCH /api/categories/:id)
router.patch("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { new: true },
    );
    if (!updatedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: "Error updating category" });
  }
});

// ৪. ক্যাটাগরি ডিলিট করা (DELETE /api/categories/:id)
router.delete("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const deletedCategory = await Category.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!deletedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category" });
  }
});

export default router;
