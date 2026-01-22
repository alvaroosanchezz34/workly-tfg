const MetricCard = ({ title, value, color }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <p style={styles.title}>{title}</p>
      <h2 style={{ ...styles.value, color }}>{value}</h2>
    </div>
  );
};

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    minWidth: '220px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '8px',
  },
  value: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
};

export default MetricCard;
