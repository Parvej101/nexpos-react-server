import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    address: { type: String },
    category: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true },
);

SupplierSchema.index({ phone: 1, tenantId: 1 }, { unique: true });

export const Supplier = mongoose.model("Supplier", SupplierSchema);
