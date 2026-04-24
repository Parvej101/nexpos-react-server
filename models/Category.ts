import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    // এই লাইনটি যোগ করুন
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true },
);

CategorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const Category = mongoose.model("Category", CategorySchema);
