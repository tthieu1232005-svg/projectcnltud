const express = require("express");
const router = express.Router();

const PaymentHistory = require("../models/Payment_History");

// IMPORTANT: /host/payments
router.get("/payments", async (req, res) => {
  try {
    const payments = await PaymentHistory.find()
      .populate("CustomerID", "name email")
      .populate("HostID", "name email")
      .sort({ createdAt: -1 });

    console.log("OK payments:", payments.length);

    return res.render("host/payments", {
      payments: payments, // 🔥 BẮT BUỘC
    });
  } catch (err) {
    console.log("ERROR:", err);

    return res.render("host/payments", {
      payments: [], // fallback
    });
  }
});

module.exports = router;
