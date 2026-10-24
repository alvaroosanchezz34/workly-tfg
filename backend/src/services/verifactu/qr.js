export const LEGEND = 'VERI*FACTU';

const URLS = {
    test: 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR',
    production: 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR',
};

// Solo estos cuatro parámetros, en este orden. UTF-8 con encodeURIComponent.
// El importe es el ImporteTotal del registro (base + IVA + recargo), con dos decimales.
export const buildQrUrl = ({ nif, numserie, fecha, importe, env }) => {
    const base = env === 'production' ? URLS.production : URLS.test;
    const query = [
        ['nif', nif],
        ['numserie', numserie],
        ['fecha', fecha],
        ['importe', importe],
    ].map(([key, value]) => `${key}=${encodeURIComponent(String(value ?? '').trim())}`).join('&');
    return `${base}?${query}`;
};

export const QR_SIZE_PT = 99;
export const QR_LABEL = 'QR tributario:';
