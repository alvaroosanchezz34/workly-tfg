import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);
    const resolver = useRef(null);

    const toast = useCallback((message, tone = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts(list => [...list, { id, message, tone }]);
        setTimeout(() => setToasts(list => list.filter(item => item.id !== id)), 4200);
    }, []);

    const ask = useCallback((options) => new Promise(resolve => {
        resolver.current = resolve;
        setDialog({
            title: options.title || 'Confirmar',
            body: options.body || '',
            confirmLabel: options.confirmLabel || 'Confirmar',
            danger: Boolean(options.danger),
        });
    }), []);

    const closeDialog = (accepted) => {
        setDialog(null);
        resolver.current?.(accepted);
        resolver.current = null;
    };

    const value = useMemo(() => ({ toast, ask }), [toast, ask]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <div className="toast-stack" aria-live="polite" aria-relevant="additions">
                {toasts.map(item => (
                    <div key={item.id} className={`toast toast-${item.tone}`} role="status">
                        {item.message}
                    </div>
                ))}
            </div>
            {dialog && (
                <div className="modal-backdrop" role="presentation">
                    <div className="modal-box confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
                        <h3 id="confirm-title" className="modal-title">{dialog.title}</h3>
                        <p id="confirm-body" style={{ margin: '12px 0 20px', color: 'var(--text-secondary)' }}>{dialog.body}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => closeDialog(false)}>Cancelar</button>
                            <button type="button" className={dialog.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => closeDialog(true)} autoFocus>
                                {dialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error('useFeedback fuera del proveedor');
    return ctx;
}
