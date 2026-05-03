import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { Supplier } from "../models/Supplier.js";

const router = express.Router();

// ১. সব সাপ্লায়ার দেখা (GET /api/suppliers)
router.get("/", verifyToken, async (req: any, res: any) => {
  try {
    const suppliers = await Supplier.find({ tenantId: req.user.tenantId }).sort(
      { name: 1 },
    );
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching suppliers" });
  }
});

// ২. নতুন সাপ্লায়ার যোগ করা (POST /api/suppliers/add)
router.post("/add", verifyToken, async (req: any, res: any) => {
  try {
    const supplierData = { ...req.body, tenantId: req.user.tenantId };
    const newSupplier = new Supplier(supplierData);
    await newSupplier.save();
    res.status(201).json(newSupplier);
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Supplier with this phone already exists" });
    }
    res.status(500).json({ message: "Error adding supplier" });
  }
});

// ৩. সাপ্লায়ার আপডেট করা (PATCH /api/suppliers/:id)
router.patch("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const updated = await Supplier.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: "after" },
    );
    if (!updated)
      return res.status(404).json({ message: "Supplier not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating supplier" });
  }
});

// ৪. সাপ্লায়ার ডিলিট করা (DELETE /api/suppliers/:id)
router.delete("/:id", verifyToken, async (req: any, res: any) => {
  try {
    const deleted = await Supplier.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!deleted)
      return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting supplier" });
  }
});

export default router;
