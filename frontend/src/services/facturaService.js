import axios from 'axios';

const API_URL = 'https://farmacia-backend-0vrq.onrender.com'; // Cambia el puerto según tu backend

export const generarYEnviarFactura = async (dteJson) => {
    try {
        const response = await axios.post(`${API_URL}/enviar`, dteJson, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al enviar la factura:', error);
        throw error;
    }
};