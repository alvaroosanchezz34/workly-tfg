// ── MetricCard ───────────────────────────────────────────────
export const MetricCard = ({ title, value, accentColor, icon }) => (
    <div className="metric-card" style={{ '--accent-color': accentColor || 'var(--primary)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <p className="metric-label">{title}</p>
            {icon && (
                <div style={{ width:34, height:34, borderRadius:7, background:`${accentColor || '#1976D2'}14`, color: accentColor || 'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {icon}
                </div>
            )}
        </div>
        <p className="metric-value" style={{ color: accentColor || 'var(--text-primary)', marginTop:8 }}>{value}</p>
    </div>
);

export default MetricCard;