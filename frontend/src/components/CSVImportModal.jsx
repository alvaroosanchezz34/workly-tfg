// frontend/src/components/CSVImportModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import { parseCSVToObjects } from '../utils/csv';
import { Upload, FileText } from 'lucide-react';

// Modal genérico de importación CSV con vista previa antes de confirmar.
// `columns`: [{ key, label }] — columnas esperadas, solo para mostrar la vista previa.
// `onImport(records)`: función async que envía las filas parseadas al backend.
export default function CSVImportModal({ open, onClose, title, columns, hint, onImport }) {
    const [fileName, setFileName] = useState('');
    const [records,  setRecords]  = useState([]);
    const [error,    setError]    = useState('');
    const [importing, setImporting] = useState(false);
    const [result,   setResult]   = useState(null);

    const reset = () => { setFileName(''); setRecords([]); setError(''); setResult(null); };
    const handleClose = () => { reset(); onClose(); };

    const handleFile = e => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(''); setResult(null);
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const { records: rows } = parseCSVToObjects(String(ev.target.result));
                if (rows.length === 0) { setError('El archivo no tiene filas de datos.'); return; }
                setRecords(rows);
            } catch {
                setError('No se pudo leer el archivo. Comprueba que sea un CSV válido.');
            }
        };
        reader.readAsText(file);
    };

    const handleConfirm = async () => {
        setImporting(true); setError('');
        try {
            const res = await onImport(records);
            setResult(res);
        } catch {
            setError('Error al importar. Inténtalo de nuevo.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal open={open} size="lg" title={title} onClose={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {hint && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>{hint}</p>}

                {!result && (
                    <>
                        <label style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                            border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 16px',
                            cursor: 'pointer', color: 'var(--text-secondary)',
                        }}>
                            <Upload size={22} />
                            <span style={{ fontSize: 13 }}>{fileName || 'Selecciona un archivo .csv'}</span>
                            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
                        </label>

                        {error && <div className="alert alert-danger">{error}</div>}

                        {records.length > 0 && (
                            <>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                                    <FileText size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                                    {records.length} fila{records.length !== 1 ? 's' : ''} detectada{records.length !== 1 ? 's' : ''}. Vista previa (primeras 5):
                                </p>
                                <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {records.slice(0, 5).map((r, i) => (
                                                <tr key={i}>{columns.map(c => <td key={c.key}>{r[c.key] || <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>)}</tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancelar</button>
                            <button type="button" className="btn btn-primary" disabled={records.length === 0 || importing} onClick={handleConfirm}>
                                {importing ? 'Importando…' : `Importar ${records.length || ''}`.trim()}
                            </button>
                        </div>
                    </>
                )}

                {result && (
                    <>
                        <div className="alert alert-success">{result.message}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-primary" onClick={handleClose}>Cerrar</button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
