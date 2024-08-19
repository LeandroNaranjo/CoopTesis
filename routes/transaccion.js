const express = require('express');
const router = express.Router();
const { processTransaction } = require('../controllers/transaccionController');

router.post('/', async (req, res) => {
  try {
    const { senderId, receiverId, amount, description } = req.body;
    const result = await processTransaction(senderId, receiverId, amount, description);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error procesando la transacción', error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY transaction_date DESC'); // Ajusta esta consulta a tu esquema
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al recuperar el historial de transacciones', error: error.message });
  }
});

module.exports = router;
