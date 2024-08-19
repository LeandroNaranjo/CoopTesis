const mysql = require('mysql2');
const { Client, Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a MySQL
const mysqlConnection = mysql.createConnection({
	host: process.env.MYSQL_DB_HOST,
	user: process.env.MYSQL_DB_USER,
	password: process.env.MYSQL_DB_PASSWORD,
	database: process.env.MYSQL_DB_NAME,
	port: process.env.MYSQL_DB_PORT,
});

mysqlConnection.connect(err => {
	if (err) {
		console.error('Error connecting to MySQL:', err);
		return;
	}
	console.log('Conectado a MySQL');
});

// Configuración de la conexión a PostgreSQL
const pgClient = new Pool({
	user: process.env.DB_USERNAME,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD.trim(),
	port: process.env.DB_PORT,
});

pgClient.connect(err => {
	if (err) {
		console.error('Error conectando a PostgreSQL:', err.stack);
		return;
	}
	console.log('Conectado a PostgreSQL');
});

module.exports = { pgClient };