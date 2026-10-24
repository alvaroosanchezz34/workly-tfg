const pad = n => String(n).padStart(2, '0');

export const fechaAeat = value => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const parts = madridParts(value);
        return `${parts.day}-${parts.month}-${parts.year}`;
    }
    const text = String(value ?? '').trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    if (/^\d{2}-\d{2}-\d{4}$/.test(text)) return text;
    const err = new Error('Fecha de expedición no válida');
    err.statusCode = 400;
    throw err;
};

export const madridParts = date => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map(part => [part.type, part.value]));
    return parts;
};

export const madridOffset = date => {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        timeZoneName: 'longOffset',
    });
    const name = fmt.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';
    const match = name.match(/GMT([+-]\d{2}:\d{2})/);
    if (!match) {
        const err = new Error('No se pudo calcular el huso de Europe/Madrid');
        err.statusCode = 500;
        throw err;
    }
    return match[1];
};

// xs:dateTime con offset, el mismo estilo que los ejemplos de la AEAT (2024-01-01T19:20:30+01:00).
export const fechaHoraMadrid = (date = new Date()) => {
    const when = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(when.getTime())) {
        const err = new Error('Fecha y hora de generación no válidas');
        err.statusCode = 400;
        throw err;
    }
    const parts = madridParts(when);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${madridOffset(when)}`;
};

export { pad };
