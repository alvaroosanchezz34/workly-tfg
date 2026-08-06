export const FormField = ({ label, required, htmlFor, children }) => (
    <div className="form-group">
        <label className="form-label" htmlFor={htmlFor}>
            {label}
            {required && <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span>}
        </label>
        {children}
    </div>
);

export const Input = ({ label, required, id, name, ...props }) => {
    const fieldId = id || name;
    return (
        <FormField label={label} required={required} htmlFor={fieldId}>
            <input className="form-input" id={fieldId} name={name} {...props} />
        </FormField>
    );
};

export const Select = ({ label, required, options, placeholder, id, name, ...props }) => {
    const fieldId = id || name;
    return (
        <FormField label={label} required={required} htmlFor={fieldId}>
            <select className="form-select" id={fieldId} name={name} {...props}>
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </FormField>
    );
};

export const Textarea = ({ label, required, id, name, ...props }) => {
    const fieldId = id || name;
    return (
        <FormField label={label} required={required} htmlFor={fieldId}>
            <textarea className="form-textarea" id={fieldId} name={name} {...props} />
        </FormField>
    );
};

export const FormFooter = ({ onCancel, loading, submitLabel = 'Guardar' }) => (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:18, borderTop:'1px solid var(--border)', marginTop:4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando…' : submitLabel}
        </button>
    </div>
);