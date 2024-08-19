const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware'); // Importar el middleware

router.get('/verificar-cedula/:id', authController.verificarUsuario);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', authController.changePassword); // Ruta protegida
router.post('/recoverPassword', authMiddleware, authController.recoverPassword); // Ruta protegida

module.exports = router;
