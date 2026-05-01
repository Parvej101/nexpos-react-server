import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // এখানে enum এর ভেতর সবকটি রোল যোগ করতে হবে
    role: {
      type: String,
      enum: ["super_admin", "shop_owner", "cashier"],
      default: "cashier",
    },

    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
