const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Obtener el token de los encabezados de la petición
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        // Verificar el token
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Añadir el idpersona verificado a la petición
        req.user = verified;

        next(); // Continuar con el siguiente middleware o ruta
    } catch (error) {
        res.status(400).json({ success: false, message: 'Token inválido.' });
    }
};

module.exports = authMiddleware;
