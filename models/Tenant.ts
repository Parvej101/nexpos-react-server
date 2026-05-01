import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export const Tenant = mongoose.model("Tenant", TenantSchema);
