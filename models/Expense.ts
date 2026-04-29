import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, required: true }, // যেমন: EXP-1001
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: "Cash" },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ExpenseSchema.index({ expenseId: 1, tenantId: 1 }, { unique: true });

export const Expense = mongoose.model("Expense", ExpenseSchema);
