import { createHash } from 'crypto';

const trim = value => String(value ?? '').trim();

export const sha256Upper = text => createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase();

// Orden y nombres de campo fijados por AEAT en
// "Especificaciones técnicas para la generación de la huella o hash de los registros de facturación".
// No entran Subsanacion, RechazoPrevio ni la descripción: cambiarlos no cambia la huella.
export const huellaAlta = ({
    idEmisor, numSerie, fechaExpedicion, tipoFactura, cuotaTotal, importeTotal, huellaAnterior, fechaHora,
}) => {
    const cadena = [
        `IDEmisorFactura=${trim(idEmisor)}`,
        `NumSerieFactura=${trim(numSerie)}`,
        `FechaExpedicionFactura=${trim(fechaExpedicion)}`,
        `TipoFactura=${trim(tipoFactura)}`,
        `CuotaTotal=${trim(cuotaTotal)}`,
        `ImporteTotal=${trim(importeTotal)}`,
        `Huella=${trim(huellaAnterior)}`,
        `FechaHoraHusoGenRegistro=${trim(fechaHora)}`,
    ].join('&');
    return { cadena, huella: sha256Upper(cadena) };
};

export const huellaAnulacion = ({
    idEmisor, numSerie, fechaExpedicion, huellaAnterior, fechaHora,
}) => {
    const cadena = [
        `IDEmisorFacturaAnulada=${trim(idEmisor)}`,
        `NumSerieFacturaAnulada=${trim(numSerie)}`,
        `FechaExpedicionFacturaAnulada=${trim(fechaExpedicion)}`,
        `Huella=${trim(huellaAnterior)}`,
        `FechaHoraHusoGenRegistro=${trim(fechaHora)}`,
    ].join('&');
    return { cadena, huella: sha256Upper(cadena) };
};
