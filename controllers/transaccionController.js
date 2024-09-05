const mysqlConnection = require('../configs/mysqlConnection');

// Controlador para transferir fondos
const transferirFondos = (req, res) => {
    const { cuentaOrigen, cuentaDestino, monto } = req.body;

    if (monto <= 0) {
        return res.status(400).json({ success: false, message: 'El monto debe ser mayor a cero.' });
    }

    mysqlConnection.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al iniciar la transacción.' });
        }

        // Verificar y actualizar saldo de la cuenta origen
        mysqlConnection.query(
            'SELECT saldo_final FROM cuentas WHERE numero_cuenta = ? FOR UPDATE',
            [cuentaOrigen],
            (err, results) => {
                if (err) {
                    return rollbackTransaction(res, err);
                }

                if (results.length === 0 || results[0].saldo_final < monto) {
                    return rollbackTransaction(res, 'Saldo insuficiente o cuenta no encontrada.');
                }

                const nuevoSaldoOrigen = results[0].saldo_final - monto;

                mysqlConnection.query(
                    'UPDATE cuentas SET saldo_final = ? WHERE numero_cuenta = ?',
                    [nuevoSaldoOrigen, cuentaOrigen],
                    (err) => {
                        if (err) {
                            return rollbackTransaction(res, err);
                        }

                        // Verificar y actualizar saldo de la cuenta destino
                        mysqlConnection.query(
                            'SELECT saldo_final FROM cuentas WHERE numero_cuenta = ? FOR UPDATE',
                            [cuentaDestino],
                            (err, results) => {
                                if (err) {
                                    return rollbackTransaction(res, err);
                                }

                                if (results.length === 0) {
                                    return rollbackTransaction(res, 'Cuenta destino no encontrada.');
                                }

                                const nuevoSaldoDestino = results[0].saldo_final + monto;

                                mysqlConnection.query(
                                    'UPDATE cuentas SET saldo_final = ? WHERE numero_cuenta = ?',
                                    [nuevoSaldoDestino, cuentaDestino],
                                    (err) => {
                                        if (err) {
                                            return rollbackTransaction(res, err);
                                        }

                                        mysqlConnection.commit((err) => {
                                            if (err) {
                                                return rollbackTransaction(res, err);
                                            }

                                            res.json({ success: true, message: 'Transferencia realizada con éxito.' });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
};

// Controlador para obtener el historial de transacciones
const obtenerHistorialTransacciones = (req, res) => {
    const { id_socio } = req.query;

    const query = `
        SELECT 
            t.fecha, 
            t.hora, 
            t.valor_efectivo, 
            s.saldo_efectivo
        FROM 
            transaccion t
        JOIN 
            saldos_socio s 
        ON 
            t.id_socio = s.id_socio
        WHERE 
            t.id_socio = ?
    `;

    mysqlConnection.query(query, [id_socio], (err, results) => {
        if (err) {
            console.error('Error en la consulta MySQL:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener el historial.' });
        }

        res.json({ success: true, data: results });
    });
};

// Controlador para obtener la posición consolidada
const obtenerPosicionConsolidada = (req, res) => {
    const { id_socio } = req.query;

    mysqlConnection.query(
        'SELECT id_socio AS numero_cuenta, saldo_efectivo FROM saldos_socio WHERE id_socio = ?',
        [id_socio],
        (err, results) => {
            if (err) {
                console.error('Error en la consulta MySQL:', err);
                return res.status(500).json({ success: false, message: 'Error al obtener la posición consolidada.' });
            }

            res.json({ success: true, data: results });
        }
    );
};


function rollbackTransaction(res, error) {
    mysqlConnection.rollback(() => {
        console.error('Error en la transacción:', error);
        res.status(500).json({ success: false, message: 'Error en la transacción.' });
    });
}
const crearTransaccion = (req, res) => {
    const {
        sucursal_socio,
        id_socio,
        sucursal_transaccion,
        clave_operador,
        numero_orden,
        codigo,
        deposito,
        valor_efectivo,
        valor_cheque,
        valor_transferencia,
        saldo_final,
        numero_documento,
        nombre_maquina
    } = req.body;

    // Calcula el nuevo saldo basado en la operación
    const nuevoSaldo = saldo_final + valor_efectivo + valor_cheque + valor_transferencia;

    mysqlConnection.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al iniciar la transacción.' });
        }

        // Paso 1: Insertar la transacción
        const queryTransaccion = `
            INSERT INTO transaccion 
            (sucursal_socio, id_socio, sucursal_transaccion, fecha, hora, clave_operador, 
            numero_orden, codigo, deposito, valor_efectivo, valor_cheque, 
            valor_transferencia, saldo_final, numero_documento, nombre_maquina) 
            VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        mysqlConnection.query(queryTransaccion, [
            sucursal_socio, id_socio, sucursal_transaccion, clave_operador, 
            numero_orden, codigo, deposito, valor_efectivo, valor_cheque, 
            valor_transferencia, saldo_final, numero_documento, nombre_maquina
        ], (err, results) => {
            if (err) {
                return mysqlConnection.rollback(() => {
                    console.error('Error al insertar en la tabla transaccion:', err);
                    res.status(500).json({ success: false, message: 'Error al guardar la transacción.' });
                });
            }

            // Paso 2: Actualizar el saldo en la tabla saldos_socios
            const querySaldo = `
                UPDATE saldos_socio 
                SET saldo_efectivo = ? 
                WHERE id_socio = ?
            `;

            mysqlConnection.query(querySaldo, [nuevoSaldo, id_socio], (err, results) => {
                if (err) {
                    return mysqlConnection.rollback(() => {
                        console.error('Error al actualizar el saldo en saldos_socios:', err);
                        res.status(500).json({ success: false, message: 'Error al actualizar el saldo.' });
                    });
                }

                // Si todo fue exitoso, hacemos commit a la transacción
                mysqlConnection.commit((err) => {
                    if (err) {
                        return mysqlConnection.rollback(() => {
                            console.error('Error al hacer commit:', err);
                            res.status(500).json({ success: false, message: 'Error al finalizar la transacción.' });
                        });
                    }

                    res.json({ success: true, message: 'Transacción y saldo actualizados correctamente.' });
                });
            });
        });
    });
};


module.exports = {
    transferirFondos,
    obtenerHistorialTransacciones,
    obtenerPosicionConsolidada,
    crearTransaccion
};
