// Un ejemplo simple, puedes personalizarlo con estilos
const Card = ({ titulo, valor }) => (
  <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '0.5rem' }}>
    <h4>{titulo}</h4>
    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{valor}</p>
  </div>
);

export default Card;