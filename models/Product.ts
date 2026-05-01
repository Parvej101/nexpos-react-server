import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  barcode: string;
  price: number;
  purchasePrice: number;
  stock: number;
  category: string;
  unit: string;
  alertQty: number;
  image?: string;
  tenantId: mongoose.Types.ObjectId;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    barcode: { type: String, required: true },
    price: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String, required: true },
    unit: { type: String, default: "pcs" },
    alertQty: { type: Number, default: 5 },
    // ইমেজ ফিল্ড যোগ করা হলো
    image: { type: String, default: "" },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true },
);

// এটিই আসল জাদু: বারকোড এবং টেন্যান্ট আইডি মিলে ইউনিক হবে
// অর্থাৎ: Shop A তে IT1 থাকতে পারবে, আবার Shop B তেও IT1 থাকতে পারবে।
ProductSchema.index({ barcode: 1, tenantId: 1 }, { unique: true });

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
