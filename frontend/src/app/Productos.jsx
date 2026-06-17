import { useEffect, useState } from 'react';
import { getProductos } from '../services/productos';

const Productos = () => {
    const [productos, setProductos] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getProductos();
            setProductos(data);
        };
        fetchData();
    }, []);

    return (
        <div>
            {productos.map(p => (
                <div key={p.id}>{p.nombre} - ${p.precio}</div>
            ))}
        </div>
    );
};

export default Productos;