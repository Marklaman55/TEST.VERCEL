/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Phone, DollarSign, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import axios from "axios";

// Status types
type PaymentStatus = "idle" | "requesting" | "pending" | "success" | "failed";

// Define the shape of environment variables for TypeScript
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const PRODUCTS = [
  {
    id: "prod_1",
    name: "Wireless Headphones",
    price: 150,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
    description: "Premium sound with noise cancellation."
  },
  {
    id: "prod_2",
    name: "Smart Watch",
    price: 3000,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    description: "Track your health and stay connected."
  },
  {
    id: "prod_3",
    name: "Minimalist Camera",
    price: 4500,
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecbc9756c?w=500&q=80",
    description: "Capture moments in stunning detail."
  }
];

export default function App() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);

  // Use the API URL from env or default to current origin
  const API_URL = (import.meta as any).env?.VITE_API_URL || "";

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("requesting");

    try {
      const response = await axios.post(`${API_URL}/api/payments/stkpush`, {
        phone,
        amount: Number(amount),
      });

      setCheckoutRequestID(response.data.checkoutRequestID);
      setStatus("pending");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to initiate payment");
      setStatus("idle");
    }
  };

  const startCheckout = (product: typeof PRODUCTS[0]) => {
    setSelectedProduct(product);
    setAmount(product.price.toString());
  };

  // Polling logic
  useEffect(() => {
    let interval: any;

    if (status === "pending" && checkoutRequestID) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/api/payments/status/${checkoutRequestID}`);
          if (response.data.status === "success") {
            setStatus("success");
            clearInterval(interval);
          } else if (response.data.status === "failed") {
            setStatus("failed");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, checkoutRequestID, API_URL]);

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-[#141414]">
      {/* Navbar */}
      <nav className="h-20 border-b border-gray-100 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg"></div>
          <span className="font-bold text-xl tracking-tight">LUXE</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
          <a href="#" className="text-black">Shop</a>
          <a href="#">Collections</a>
          <a href="#">Support</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!selectedProduct ? (
            <motion.div 
              key="store"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="max-w-2xl">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Featured Products</h1>
                <p className="mt-4 text-lg text-gray-500 font-medium">Curated high-quality items for your lifestyle. Select an item to proceed with M-Pesa checkout.</p>
              </div>

              <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                {PRODUCTS.map((product) => (
                  <motion.div 
                    key={product.id}
                    whileHover={{ y: -5 }}
                    className="group relative"
                  >
                    <div className="w-full h-80 bg-gray-200 rounded-[24px] overflow-hidden group-hover:opacity-75 transition-all shadow-sm">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-center object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mt-6 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                      </div>
                      <p className="text-lg font-black text-gray-900">KES {product.price}</p>
                    </div>
                    <button
                      onClick={() => startCheckout(product)}
                      className="mt-4 w-full bg-black text-white rounded-2xl py-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-[0.98]"
                    >
                      Buy Now
                      <ArrowRight size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col lg:flex-row gap-12 items-start justify-center"
            >
              {/* Product Info Summary */}
              <div className="w-full lg:w-1/3 space-y-6">
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setStatus("idle");
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors"
                >
                  <ArrowRight className="rotate-180" size={16} />
                  BACK TO SHOP
                </button>
                
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
                  <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{selectedProduct.description}</p>
                  </div>
                  <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                    <span className="font-bold text-gray-400">Total Due</span>
                    <span className="text-2xl font-black">KES {selectedProduct.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Card */}
              <motion.div 
                className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-[0_4px_32px_rgba(0,0,0,0.06)] border border-[#e5e5e5]"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-[#3cb371] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#3cb37144]">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">M-Pesa Checkout</h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Secure STK Push</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {status === "idle" || status === "requesting" ? (
                    <motion.form
                      key="payment-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handlePay}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Phone size={18} />
                            </div>
                            <input
                              type="text"
                              required
                              placeholder="2547XXXXXXXX"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full bg-[#f8f8f8] border border-[#eeeeee] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#3cb371] transition-all text-lg font-medium"
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 ml-1 font-medium">Format: 254712345678</p>
                        </div>
                      </div>

                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 border border-red-100"
                        >
                          <XCircle size={16} />
                          {error}
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={status === "requesting"}
                        className="w-full bg-[#141414] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#222] transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {status === "requesting" ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span>Pay KES {amount}</span>
                            <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="payment-status"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-6 flex flex-col items-center text-center space-y-6"
                    >
                      {status === "pending" && (
                        <div className="space-y-6 w-full">
                          <div className="relative flex items-center justify-center">
                            <motion.div 
                              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 2.5 }}
                              className="w-32 h-32 bg-[#3cb371] rounded-full absolute"
                            />
                            <div className="w-20 h-20 bg-white border-2 border-[#3cb371] rounded-full flex items-center justify-center shadow-xl shadow-[#3cb37122] z-10">
                              <Loader2 size={40} className="animate-spin text-[#3cb371]" />
                            </div>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Authorization Sent</h2>
                            <p className="text-gray-500 mt-4 leading-relaxed text-sm px-4">
                              Check your phone <span className="font-bold text-black">{phone}</span>. 
                              Enter your M-Pesa PIN to authorize the payment.
                            </p>
                          </div>
                          <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest animate-pulse">
                            Waiting for M-Pesa confirm...
                          </div>
                        </div>
                      )}

                      {status === "success" && (
                        <div className="space-y-6">
                          <div className="w-24 h-24 bg-[#3cb371] rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-[#3cb37144]">
                            <CheckCircle2 size={48} />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-[#3cb371] tracking-tight">Confirmed!</h2>
                            <p className="text-gray-500 mt-2 text-sm">Your order for <span className="font-bold">{selectedProduct.name}</span> has been processed. We've sent a confirmation email.</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl text-xs font-mono text-gray-400 break-all select-none">
                            Ref: {checkoutRequestID}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProduct(null);
                              setStatus("idle");
                              setAmount("");
                              setPhone("");
                            }}
                            className="w-full py-4 rounded-2xl bg-black text-white font-bold hover:bg-gray-800 transition-all"
                          >
                            Return to Store
                          </button>
                        </div>
                      )}

                      {status === "failed" && (
                        <div className="space-y-6">
                          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-red-200">
                            <XCircle size={48} />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black text-red-500 tracking-tight">Payment Denied</h2>
                            <p className="text-gray-500 mt-2 text-sm leading-relaxed">The transaction was cancelled or there were insufficient funds. Please try again or use another number.</p>
                          </div>
                          <button
                            onClick={() => setStatus("idle")}
                            className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-[#222] transition-all"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-widest gap-6">
        <div>&copy; 2026 LUXE Premium. All rights reserved.</div>
        <div className="flex items-center gap-8">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Accessibility</a>
        </div>
      </footer>
    </div>
  );
}
