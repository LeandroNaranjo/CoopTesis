const pool = require('../connection'); 


exports.processTransaction = async (senderId, receiverId, amount, description) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE userId = $2', [amount, senderId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE userId = $2', [amount, receiverId]);


    await client.query('INSERT INTO transactions (senderId, receiverId, amount, description) VALUES ($1, $2, $3, $4)', [senderId, receiverId, amount, description]);

    await client.query('COMMIT');

    return { success: true, message: 'Transacción completada con éxito' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error; 
  } finally {
    client.release();
  }
};
