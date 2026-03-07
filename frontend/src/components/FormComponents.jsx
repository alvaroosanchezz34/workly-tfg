export const FormField = ({ label, required, children }) => (
    <div className="form-group">
        <label className="form-label">
            {label}
            {required && <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span>}
        </label>
        {children}
    </div>
);

export const Input = ({ label, required, ...props }) => (
    <FormField label={label} required={required}>
        <input className="form-input" {...props} />
    </FormField>
);

export const Select = ({ label, required, options, placeholder, ...props }) => (
    <FormField label={label} required={required}>
        <select className="form-select" {...props}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </FormField>
);

export const Textarea = ({ label, required, ...props }) => (
    <FormField label={label} required={required}>
        <textarea className="form-textarea" {...props} />
    </FormField>
);

export const FormFooter = ({ onCancel, loading, submitLabel = 'Guardar' }) => (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:18, borderTop:'1px solid var(--border)', marginTop:4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : submitLabel}
        </button>
    </div>
);