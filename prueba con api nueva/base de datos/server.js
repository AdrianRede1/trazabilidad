const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const productosRoutes = require('./routes/productos');
const usuariosRoutes = require('./routes/usuarios'); // Importar las rutas de usuario

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/trazabilidad', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes); // Usar las rutas de usuario

// Agregar una ruta para la raíz
app.get('/', (req, res) => {
    res.send('API de trazabilidad en funcionamiento'); // Mensaje de prueba
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});