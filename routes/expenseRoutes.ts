import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Expense } from "../models/Expense.js";
import { ExpenseCategory } from "../models/ExpenseCategory.js";

const router = express.Router();

// ১. সব খরচ দেখা (ফিল্টারসহ)
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const { start, end, category } = req.query;
    const query: any = { tenantId: req.user.tenantId };

    if (start && end) {
      query.date = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59)),
      };
    }
    if (category && category !== "All") {
      query.category = category;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// ২. নতুন খরচ যোগ করা
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const tenantId = req.user.tenantId;
    const count = await Expense.countDocuments({ tenantId });
    const expenseId = `EXP-${1000 + count + 1}`;

    const newExpense = new Expense({
      ...req.body,
      expenseId,
      tenantId,
      creatorId: req.user.id,
    });

    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: "Failed to add expense" });
  }
});

// ৩. ডিলিট করা
router.delete("/:id", verifyToken, async (req: any, res: any) => {
  await Expense.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.user.tenantId,
  });
  res.json({ message: "Expense deleted" });
});

router.patch("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: "after" },
    );
    if (!updatedExpense)
      return res.status(404).json({ message: "Expense not found" });
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense" });
  }
});

// ৪. ক্যাটাগরি লিস্ট পাওয়া
router.get("/categories", verifyToken, async (req: any, res: any) => {
  try {
    // ১. আপনার তৈরি করা ExpenseCategory মডেল থেকে সব ডাটা খুঁজে বের করা
    const categories = await ExpenseCategory.find({
      tenantId: req.user.tenantId,
    }).sort({ name: 1 });

    // ২. ডাটাবেস থেকে পাওয়া পুরো লিস্টটি পাঠানো
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post("/categories/add", verifyToken, async (req: any, res: any) => {
  try {
    const { name } = req.body;
    const newCat = new ExpenseCategory({ name, tenantId: req.user.tenantId });
    await newCat.save();
    res.status(201).json(newCat);
  } catch (error: any) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Category exists" });
    res.status(500).json({ message: "Error" });
  }
});

export default router;
