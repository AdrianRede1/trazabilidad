const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    identificador: { type: String, required: true },
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true },
    origen: {
        nombreRemitente: { type: String, required: true },
        identificacionFiscal: { type: String, required: true },
        contacto: { type: String, required: true }
    },
    destino: {
        nombreDestinatario: { type: String, required: true },
        identificacion: { type: String, required: true },
        contacto: { type: String, required: true }
    },
    transporte: {
        nombreEmpresa: { type: String, required: true },
        medioTransporte: { type: String, required: true },
        numeroGuia: { type: String, required: true }
    }
});

module.exports = mongoose.model('Producto', productoSchema);