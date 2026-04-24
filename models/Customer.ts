import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    points: { type: Number, default: 0 },
    history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // অর্ডারের হিস্ট্রি
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true },
);

// একই দোকানের ভেতর একই ফোন নম্বর দুইবার হবে না
CustomerSchema.index({ phone: 1, tenantId: 1 }, { unique: true });

export const Customer = mongoose.model("Customer", CustomerSchema);
