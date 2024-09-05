const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transaccionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta para transferir fondos
 router.post('/transfer', transferController.transferirFondos);  //authMiddleware, transferController.transferirFondos

// Ruta para obtener el historial de transacciones
router.get('/historial', transferController.obtenerHistorialTransacciones) //authMiddleware, transferController.obtenerHistorialTransacciones);

// Ruta para obtener la posición consolidada
router.get('/posicion-consolidada',transferController.obtenerPosicionConsolidada) //authMiddleware, transferController.obtenerPosicionConsolidada);

//ruta para hacer un deposito
router.post('/deposito', transferController.crearTransaccion);
module.exports = router;
