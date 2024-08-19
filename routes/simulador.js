const express = require('express');
const router = express.Router();

router.post('/simulate', (req, res) => {
  const { principal, annualInterestRate, numberOfPayments } = req.body;
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const payment = (principal * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
  
  res.json({ monthlyPayment: parseFloat(payment.toFixed(2)) });
});

module.exports = router;