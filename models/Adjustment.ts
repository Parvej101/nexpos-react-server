import mongoose from "mongoose";

// প্রতিটি আইটেমের জন্য আলাদা স্কিমা (এটি মেইন স্কিমায় ব্যবহার হবে)
const AdjustmentItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  type: { type: String, enum: ["addition", "subtraction"], required: true },
  amount: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  itemTotalValue: { type: Number, default: 0 },
});

const AdjustmentSchema = new mongoose.Schema(
  {
    adjustmentId: { type: Number, required: true },
    reason: { type: String, required: true },
    note: { type: String, default: "" },
    totalValueChange: { type: Number, default: 0 },
    items: [AdjustmentItemSchema], // এখানে ওপরের স্কিমাটি ব্যবহার করা হলো
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// এক দোকানের ভেতর যেন একই আইডি না হয় (যদিও সিরিয়াল হবে, তবুও সেফটি)
AdjustmentSchema.index({ adjustmentId: 1, tenantId: 1 }, { unique: true });

export const Adjustment = mongoose.model("Adjustment", AdjustmentSchema);
