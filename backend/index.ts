import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// In-memory status storage (In production, use a DB)
const payments: Record<string, { status: "pending" | "success" | "failed"; details?: any }> = {};

app.use(cors());
app.use(express.json());

// Helper: Generate M-Pesa OAuth Token
async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret || consumerKey === "your_key" || consumerSecret === "your_secret") {
    throw new Error("M-Pesa API credentials (Consumer Key/Secret) are missing. Please set them in your environment variables.");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error: any) {
    console.error("M-Pesa Auth Error:", error.response?.data || error.message);
    throw new Error("Failed to get M-Pesa access token");
  }
}

// Endpoint: STK Push initiation
app.post("/api/payments/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
       res.status(400).json({ error: "Phone and amount are required" });
       return;
    }

    // Format phone to 254XXXXXXXXX
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Validate length roughly
    if (formattedPhone.length !== 12) {
       res.status(400).json({ error: "Invalid phone number format. Expected 254XXXXXXXXX" });
       return;
    }

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];
    const shortcode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL}/api/payments/callback`;

    const stkResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: "TrialPayment",
        TransactionDesc: "Payment for demo",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const checkoutRequestID = stkResponse.data.CheckoutRequestID;
    
    // Store in memory
    payments[checkoutRequestID] = { status: "pending" };

    res.json({ checkoutRequestID });
  } catch (error: any) {
    const errorMsg = error.response?.data?.errorMessage || error.message || "Internal Server Error";
    console.error("STK Push Error:", errorMsg);
    res.status(500).json({ error: errorMsg });
  }
});

// Endpoint: M-Pesa Callback
app.post("/api/payments/callback", (req, res) => {
  console.log("M-Pesa Callback received:", JSON.stringify(req.body, null, 2));

  const { Body } = req.body;
  if (!Body || !Body.stkCallback) {
     res.status(400).send("Invalid callback data");
     return;
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;

  if (payments[CheckoutRequestID]) {
    payments[CheckoutRequestID].status = ResultCode === 0 ? "success" : "failed";
    payments[CheckoutRequestID].details = Body.stkCallback;
  }

  res.send("Callback received");
});

// Endpoint: Get status
app.get("/api/payments/status/:id", (req, res) => {
  const { id } = req.params;
  const payment = payments[id];

  if (!payment) {
     res.status(404).json({ status: "not_found" });
     return;
  }

  res.json({ status: payment.status });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.join(process.cwd(), "frontend"),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
