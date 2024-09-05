const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pgClient } = require('../configs/connection'); // PostgreSQL
const mysqlConnection = require('../configs/mysqlConnection'); // MySQL
const { crearNombreUsuario } = require('../utils');

// Verificación de usuario por cédula en MySQL
const verificarUsuario = (req, res) => {
    const { id } = req.params;

    mysqlConnection.query(
        'SELECT * FROM persona WHERE numero_identificacion = ?',
        [id],
        (err, results) => {
            if (err) {
                console.error('Error en la consulta MySQL:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error en la consulta MySQL.',
                });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Cédula no encontrada.' });
            }

            const cliente = results[0];
            res.json({ success: true, data: cliente });
        }
    );
};

// Registro de usuario
const register = async (req, res) => {
    const { numero_identificacion, correo, contrasena } = req.body;

    try {
        // Verificar si la cédula existe en MySQL
        const mysqlResults = await new Promise((resolve, reject) => {
            mysqlConnection.query(
                'SELECT * FROM persona WHERE numero_identificacion = ?',
                [numero_identificacion],
                (err, results) => {
                    if (err) {
                        console.error('Error en la consulta MySQL:', err);
                        return reject(err);
                    }
                    resolve(results);
                }
            );
        });

        if (!mysqlResults || mysqlResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cédula no encontrada en MySQL.',
            });
        }

        // Verificar si el correo ya existe en PostgreSQL
        const userExistInPostgreSQL = await pgClient.query(
            'SELECT * FROM esq_datos_personales.tbl_persona WHERE correo = $1',
            [correo]
        );
        if (userExistInPostgreSQL.rowCount > 0) {
            return res.status(400).json({ success: false, message: 'El usuario ya existe.' });
        }

        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const cliente = mysqlResults[0];

        // Crear el valor para la columna "nombreunido"
        const nombreunido = `${cliente.nombre || ''} ${cliente.apellido1 || ''} ${cliente.apellido2 || ''}`.trim();

        // Generar el nombre de usuario
        const usuarioGenerado = crearNombreUsuario(numero_identificacion);

        // Insertar los datos en la tabla esq_datos_personales.tbl_persona
        const insertQueryPersona = `
          INSERT INTO esq_datos_personales.tbl_persona (
            tipoidentificacion, identificacion, nombreunido, apellido1, 
            apellido2, nombres, fecha_nacimiento, direccion, 
            direccion_trabajo, telefono, sueldo, correo, usuario
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING idpersona;
        `;
        const values = [
            cliente.tipo_identificacion,
            cliente.numero_identificacion,
            nombreunido,
            cliente.apellido1 || '',
            cliente.apellido2 || '',
            cliente.nombres || '',
            cliente.fecha_nacimiento || null,
            cliente.direccion || '',
            cliente.direccion_trabajo || '',
            cliente.telefono || '',
            cliente.sueldo || 0,
            correo,
            usuarioGenerado
        ];

        const resultPersona = await pgClient.query(insertQueryPersona, values);
        const idPersona = resultPersona.rows[0].idpersona;

        // Generar un nuevo idclave basado en el valor máximo actual en la tabla
        const resultClave = await pgClient.query('SELECT MAX(idclave) FROM esq_roles.tbl_clave');
        let maxIdClave = resultClave.rows[0].max;
        let newIdClave = (maxIdClave !== null ? parseInt(maxIdClave) : 0) + 1;

        // Insertar la contraseña en la tabla esq_roles.tbl_clave
        const insertQueryClave = `
          INSERT INTO esq_roles.tbl_clave (
            idclave, idpersona, clave, estado, fecha
          ) VALUES (
            $1, $2, $3, $4, $5
          )
        `;
        const valuesClave = [newIdClave, idPersona, hashedPassword, true, new Date()];

        await pgClient.query(insertQueryClave, valuesClave);

        const insertQueryPersonaRol = `
        INSERT INTO esq_roles.tbl_persona_rol (idpersonal_rol, idpersona, id_rol, fecha, estado)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      const resultPersonaRol = await pgClient.query('SELECT MAX(idpersonal_rol) FROM esq_roles.tbl_persona_rol');
      let maxIdPersonaRol = resultPersonaRol.rows[0].max;
      let newIdPersonalRol = (maxIdPersonaRol !== null ? parseInt(maxIdPersonaRol) : 0) + 1;
      
      const valuesPersonaRol = [newIdPersonalRol, idPersona, 4, new Date(), true]; // 4 es el id_rol para "afiliado"
      await pgClient.query(insertQueryPersonaRol, valuesPersonaRol);

        res.json({
            success: true,
            message: 'Registro completado con éxito.',
        });
    } catch (error) {
        console.error('Error durante el registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error durante el registro.',
        });
    }
};

// Inicio de sesión
// Inicio de sesión
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verificar si el correo existe en la tabla esq_datos_personales.tbl_persona (PostgreSQL)
        const userQuery = `
            SELECT p.idpersona, p.identificacion, c.clave 
            FROM esq_datos_personales.tbl_persona p
            INNER JOIN esq_roles.tbl_clave c ON p.idpersona = c.idpersona
            WHERE p.correo = $1
        `;
        const userResult = await pgClient.query(userQuery, [email]);

        if (userResult.rowCount === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const { idpersona, identificacion, clave } = userResult.rows[0];

        // Comparar la contraseña proporcionada con la contraseña almacenada en la base de datos (PostgreSQL)
        const passwordMatch = await bcrypt.compare(password, clave);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        // Verificar si la cédula existe en MySQL
        const mysqlResults = await new Promise((resolve, reject) => {
            mysqlConnection.query(
                'SELECT id_persona FROM persona WHERE numero_identificacion = ?',
                [identificacion],
                (err, results) => {
                    if (err) {
                        console.error('Error en la consulta MySQL:', err);
                        return reject(err);
                    }
                    resolve(results);
                }
            );
        });

        if (!mysqlResults || mysqlResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cédula no encontrada en MySQL.',
            });
        }

        const idPersonaMySQL = mysqlResults[0].id_persona;

        // Agregar el console.log para verificar coincidencia
        console.log(`Número de cédula en pg coincide con la cédula en mysql, la id es ${idPersonaMySQL}`);

        // Si las cédulas coinciden y la contraseña es correcta, generar el token JWT
        const token = jwt.sign(
            { idpersona: idpersona }, // Payload del token
            process.env.JWT_SECRET,   // Clave secreta para firmar el token (debe estar en tus variables de entorno)
            { expiresIn: '1h' }       // El token expirará en 1 hora
        );

        // Devolvemos el token junto con el mensaje de éxito
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            token: token
        });

    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        res.status(500).json({ success: false, message: 'Error durante el inicio de sesión.' });
    }
};

// Cambio de contraseña
const changePassword = async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
        const user = await pgClient.query(
            'SELECT clave FROM esq_roles.tbl_clave WHERE idpersona = $1',
            [userId]
        );
        if (user.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const match = await bcrypt.compare(oldPassword, user.rows[0].clave);
        if (!match) {
            return res.status(401).json({ message: 'La contraseña antigua no es correcta.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pgClient.query(
            'UPDATE esq_roles.tbl_clave SET clave = $1 WHERE idpersona = $2',
            [hashedNewPassword, userId]
        );

        res.json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar la contraseña.' });
    }
};

// Recuperación de contraseña
const recoverPassword = async (req, res) => {
    const { emailOrPhone, newPassword } = req.body;

    try {
        // Buscar al usuario por correo o número de celular
        const userQuery = `
            SELECT p.idpersona 
            FROM esq_datos_personales.tbl_persona p
            WHERE p.correo = $1 OR p.telefono = $2
        `;
        const userResult = await pgClient.query(userQuery, [emailOrPhone, emailOrPhone]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const { idpersona } = userResult.rows[0];

        // Hashear la nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar la contraseña en la base de datos
        await pgClient.query(
            'UPDATE esq_roles.tbl_clave SET clave = $1 WHERE idpersona = $2',
            [hashedNewPassword, idpersona]
        );

        res.json({ success: true, message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        console.error('Error durante la recuperación de contraseña:', error);
        res.status(500).json({ success: false, message: 'Error durante la recuperación de contraseña.' });
    }
};

module.exports = {
    verificarUsuario,
    register,
    login,
    changePassword,
    recoverPassword
};
