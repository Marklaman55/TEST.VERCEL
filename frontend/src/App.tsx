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
  const [history, setHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Use the API URL from env or default to current origin
  const API_URL = (import.meta as any).env?.VITE_API_URL || "";

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payments/history`);
      setHistory(response.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(record => 
    record.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.amount.toString().includes(searchTerm) ||
    (record.mpesaReceiptNumber && record.mpesaReceiptNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      fetchHistory(); // Refresh to show pending status
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
            fetchHistory(); // Refresh to show success
            clearInterval(interval);
          } else if (response.data.status === "failed") {
            setStatus("failed");
            fetchHistory(); // Refresh to show failure
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

        {/* History Section */}
        {history.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-24 max-w-4xl mx-auto space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
                <p className="text-sm text-gray-500 font-medium">Your latest M-Pesa transactions.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-all shadow-sm w-full md:w-64"
                />
                <button 
                  onClick={fetchHistory}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black"
                  title="Refresh History"
                >
                  <Loader2 size={20} className={status === "pending" ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map((record: any) => (
                      <tr 
                        key={record.id} 
                        onClick={() => setSelectedRecord(record)}
                        className="group hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              record.status === 'success' ? 'bg-green-50 text-green-600' : 
                              record.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              <CreditCard size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-sm">{record.phone}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {record.mpesaReceiptNumber || `${record.id.substring(0, 12)}...`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                          {new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record.status === 'success' ? 'bg-green-100 text-green-700' : 
                            record.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700 animate-pulse'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-sm">
                          KES {record.amount}
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400 font-medium">
                          No transactions found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedRecord(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl ${
                    selectedRecord.status === 'success' ? 'bg-green-50 text-green-600' : 
                    selectedRecord.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <CreditCard size={32} />
                  </div>
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <XCircle size={24} className="text-gray-300" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight">KES {selectedRecord.amount}</h3>
                  <p className="text-sm text-gray-400 font-medium">Transaction to {selectedRecord.phone}</p>
                </div>

                <div className="pt-6 border-t border-gray-50 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Reference</span>
                    <span className="font-mono text-gray-600">{selectedRecord.id}</span>
                  </div>
                  {selectedRecord.mpesaReceiptNumber && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">M-Pesa Receipt</span>
                      <span className="font-bold">{selectedRecord.mpesaReceiptNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Status</span>
                    <span className={`font-bold uppercase tracking-widest text-[10px] ${
                      selectedRecord.status === 'success' ? 'text-green-600' : 
                      selectedRecord.status === 'failed' ? 'text-red-500' : 'text-blue-500'
                    }`}>{selectedRecord.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Timestamp</span>
                    <span className="font-medium text-gray-600">{new Date(selectedRecord.timestamp).toLocaleString()}</span>
                  </div>
                  {selectedRecord.resultDesc && (
                    <div className="pt-4 p-4 bg-gray-50 rounded-2xl">
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-[8px] block mb-1">M-Pesa Description</span>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{selectedRecord.resultDesc}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all"
                >
                  Close Details
                </button>
              </motion.div>
            </div>
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
