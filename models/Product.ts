import mongoose, { Document, Schema } from "mongoose";

// ১. ইন্টারফেস তৈরি করুন
export interface IProduct extends Document {
  name: string;
  barcode: string;
  price: number;
  purchasePrice: number; // এটি নিশ্চিত করুন
  stock: number;
  category: string;
  image?: string;
  tenantId: mongoose.Types.ObjectId;
}

// ২. স্কিমা তৈরি করুন
const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    purchasePrice: { type: Number, required: true }, // এটি এখানে থাকতে হবে
    stock: { type: Number, default: 0 },
    category: { type: String },
    image: { type: String, default: "" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  },
  { timestamps: true },
);

// ৩. মডেল এক্সপোর্ট করুন
export const Product = mongoose.model<IProduct>("Product", ProductSchema);
