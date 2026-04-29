import mongoose from "mongoose";

const ExpenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true },
);

// এক দোকানের ভেতর একই নাম দুইবার হবে না
ExpenseCategorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const ExpenseCategory = mongoose.model(
  "ExpenseCategory",
  ExpenseCategorySchema,
);
