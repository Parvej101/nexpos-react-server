import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // দোকানের নাম
    address: { type: String },
    phone: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
  },
  { timestamps: true },
);

export const Tenant = mongoose.model("Tenant", TenantSchema);
