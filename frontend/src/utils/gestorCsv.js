const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function toGestorCsv(data) {
    const lines = ['apartado,campo,importe'];
    const walk = (section, value) => {
        if (Array.isArray(value)) {
            value.forEach((item, index) => walk(`${section} ${index + 1}`.trim(), item));
            return;
        }
        if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, child]) => {
                walk(section ? `${section} / ${key}` : key, child);
            });
            return;
        }
        const parts = section.split(' / ');
        const field = parts.pop() || 'valor';
        lines.push([cell(parts.join(' / ')), cell(field), cell(value)].join(','));
    };
    walk('', data && typeof data === 'object' ? data : { valor: data });
    return `\uFEFF${lines.join('\n')}`;
}
