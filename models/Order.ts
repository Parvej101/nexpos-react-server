import mongoose from "mongoose";

// ১. প্রতিটি আইটেমের হিসাব (আইটেমের ভেতর পেমেন্ট রাখার দরকার নেই)
const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // ওই সময়ের বিক্রয় মূল্য
  quantity: { type: Number, required: true },
  total: { type: Number, required: true }, // price * quantity
});

const OrderSchema = new mongoose.Schema(
  {
    // হিউম্যান রিডেবল আইডি (যেমন: INV-1001)
    orderId: { type: String, required: true },

    items: [OrderItemSchema],

    // আর্থিক হিসাব
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }, // ফাইনাল অ্যামাউন্ট

    totalPaid: { type: Number, required: true }, // কাস্টমার মোট কত টাকা দিয়েছে
    dueAmount: { type: Number, default: 0 }, // কত টাকা বাকি আছে
    changeAmount: { type: Number, default: 0 }, // কত টাকা ফেরত দেওয়া হয়েছে

    // পেমেন্টের বিস্তারিত ব্রেকআপ (রিপোর্টের জন্য সবথেকে জরুরি)
    payments: {
      cash: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      bkash: { type: Number, default: 0 },
      nagad: { type: Number, default: 0 },
      bank: { type: Number, default: 0 },
    },

    // মেইন পেমেন্ট মেথড (যদি একাধিক হয় তবে 'mixed' হিসেবে সেভ হবে)
    paymentMethod: {
      type: String,
      default: "cash",
    },

    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
    },

    // রিলেশনশিপ
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// এক দোকানের ভেতর যেন একই ইনভয়েস আইডি না হয়
OrderSchema.index({ orderId: 1, tenantId: 1 }, { unique: true });

export const Order = mongoose.model("Order", OrderSchema);
