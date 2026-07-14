/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/dniController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// CONTROLADOR BACKEND - DNI:
// Recibe el DNI desde la URL, llama el servicio RENIEC y responde datos normalizados al frontend.
const axios = require('axios');
const { consultarDni } = require('../apidni/dniService');

const normalizeDniData = (inputDni, data) => {
  const nombres = String(data?.first_name || data?.nombres || '').trim();
  const apellidoPaterno = String(data?.first_last_name || data?.apellido_paterno || '').trim();
  const apellidoMaterno = String(data?.second_last_name || data?.apellido_materno || '').trim();
  const apellidos = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ').trim();
  const nombreCompleto = String(data?.full_name || [nombres, apellidos].filter(Boolean).join(' ')).trim();
  const dni = String(data?.document_number || data?.dni || inputDni || '').trim();

  if (!nombres && !apellidos && !nombreCompleto) {
    const error = new Error('Ese DNI no fue encontrado en RENIEC.');
    error.status = 404;
    throw error;
  }

  return {
    dni,
    nombres,
    apellidos,
    nombreCompleto
  };
};

// CONTROLADOR BACKEND: get Persona Por Dni procesa request/respuesta de este flujo.
const getPersonaPorDni = async (req, res) => {
  const dni = req.params.dni || req.query.dni;
  if (!dni) {
    return res.status(400).json({ message: 'Debe enviar el DNI.' });
  }

  try {
    const data = await consultarDni(dni);
    res.json(normalizeDniData(dni, data));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'No se pudo consultar DNI en Decolecta.';
      return res.status(status).json({
        message,
        details: error.response?.data
      });
    }

    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || 'No se pudo consultar DNI.'
    });
  }
};

module.exports = {
  getPersonaPorDni
};
