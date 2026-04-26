import mongoose from "mongoose";

const PurchaseSchema = new mongoose.Schema(
  {
    purchaseId: { type: String, required: true }, // যেমন: PUR-101
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: String,
    date: { type: Date, default: Date.now },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        costPrice: Number,
        total: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid"],
      default: "Unpaid",
    },

    // পেমেন্টের হিস্ট্রি (টাইমলাইনের জন্য)
    payments: [
      {
        amount: Number,
        method: String,
        date: { type: Date, default: Date.now },
        note: String,
      },
    ],

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Purchase = mongoose.model("Purchase", PurchaseSchema);
