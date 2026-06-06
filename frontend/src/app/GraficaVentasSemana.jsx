import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GraficaVentasSemana = ({ datos }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={datos}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="dia"
        tickFormatter={(val) => {
          const [y, m, d] = val.split('-');
          return `${d}/${m}`;
        }}
      />
      <YAxis tickFormatter={(v) => `$${v}`} />
      <Tooltip formatter={(v) => [`$${v}`, 'Ventas']} />
      <Line type="monotone" dataKey="ventas" stroke="#8884d8" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export default GraficaVentasSemana;