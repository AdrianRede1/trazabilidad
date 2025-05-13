const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const RPC_URL = "http://192.168.255.10:8545"; // Asegúrate de que esta URL sea correcta

// ——————————————————
// 1) Conexión a MySQL
// ——————————————————
let db;
(async () => {
    db = await mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: 'Redecillas1',
        database: 'trazabilidad',
        waitForConnections: true,
        connectionLimit: 10
    });
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('MySQL conectado - tabla users lista');
})();

// ——————————————————
// 2) Configurar nodemailer
// ——————————————————
const transporter = nodemailer.createTransport({
    host: 'smtp.ejemplo.com',
    port: 587,
    secure: false,
    auth: {
        user: 'tucuenta@ejemplo.com',
        pass: 'tu_contraseña_smtp'
    }
});

// ——————————————————
// 3) Middlewares
// ——————————————————
app.use(cors({ origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'pagina')));

// ——————————————————
// 4) Registro / Login
// ——————————————————
app.post('/api/usuarios/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const [result] = await db.query(
            'INSERT INTO users(email, password_hash) VALUES(?, ?)',
            [email, hash]
        );
        res.json({ id: result.insertId, email });
    } catch (err) {
        res.status(400).json({ error: 'Email ya registrado' });
    }
});

app.post('/api/usuarios/login', async (req, res) => {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT id, password_hash FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({ id: rows[0].id, email });
});

const CONTRACT_ADDRESS = "0x062C4B86dcA6Ed53457cf75F4699651B64CD6478";
const TOPIC0_HASH = "0xe5c2cc523913383a6000dbdbb392ecfc2ae01abccbf5c88cefd2eb575a3769cc";
const FROM_BLOCK = "0x9";

// ——————————————————
// Funciones para obtener datos de productos
// ——————————————————
async function getAllProductEvents() {
    const body = {
        jsonrpc: "2.0",
        method: "eth_getLogs",
        params: [
            {
                fromBlock: FROM_BLOCK,
                toBlock: "latest",
                address: CONTRACT_ADDRESS,
                topics: [TOPIC0_HASH],
            },
        ],
        id: 1,
    };

    try {
        const res = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await res.json();
        
        if (!json.result || json.result.length === 0) {
            console.log("🚫 No se encontraron logs.");
            return [];
        }

        const logs = json.result;

        // Procesar los logs
        const parsed = logs.map((log) => {
            const decoded = parseDataString(log.data); // Decodificar los datos del log
            return {
                id: parseInt(log.topics[1]),
                name: decoded.name || "Nombre no disponible", // Nombre del producto
                temperature: decoded.temperature || "Temperatura no disponible", // Temperatura
                latitude: decoded.latitude,
                longitude: decoded.longitude,
                altitude: decoded.altitude,
                speed: decoded.speed,
                satellites: decoded.satellites,
                txHash: log.transactionHash,
                blockNumber: parseInt(log.blockNumber, 16),
            };
        });

        return parsed.filter((e) => e.id !== 0); // Filtro por id
    } catch (err) {
        console.error("Error al obtener eventos de productos:", err);
        return [];
    }
}

// Función para decodificar datos
function parseDataString(hexData) {
    try {
        if (hexData.startsWith("0x")) hexData = hexData.slice(2);
        const buffer = new Uint8Array(
            hexData.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
        );
        const decoded = new TextDecoder().decode(buffer).replace(/\0/g, "");

        const parts = decoded.split("$");
        if (parts.length < 2) return {};

        const values = parts[1].split(",");
        if (values.length !== 5) return {};

        return {
            latitude: parseFloat(values[0]),
            longitude: parseFloat(values[1]),
            altitude: parseFloat(values[2]),
            speed: parseFloat(values[3]),
            satellites: parseInt(values[4]),
            name: parts[0], // Asumiendo que el nombre está antes del primer "$"
            temperature: parseFloat(parts[0]) || "N/A", // Si tienes la temperatura en el mismo formato
        };
    } catch (err) {
        console.error("Error al decodificar data:", err);
        return {};
    }
}

// ——————————————————
// Ruta para obtener todos los productos
// ——————————————————
app.get('/api/products', async (req, res) => {
    try {
        const products = await getAllProductEvents();
        console.log("Productos encontrados:", products); // LOG
        res.json(products);
    } catch (error) {
        console.error("Error en /api/products:", error); // LOG
        res.status(500).json({ error: 'Error al obtener la lista de productos' });
    }
});

// Ruta para la página de gestión de productos (servida desde la carpeta "pagina")
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pagina', 'gestionProductos.html'));
});

// Ruta para obtener todas las ubicaciones de un producto por ID
app.get('/api/product/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const events = await getAllProductEvents();
        const productData = events.filter(event => event.id === parseInt(id)); // Filtra todos los eventos por ID

        if (productData.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(productData); // Devuelve todas las localizaciones del producto
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos del producto' });
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
