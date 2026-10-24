export const verifactuEnv = () => (process.env.VERIFACTU_ENV === 'production' ? 'production' : 'test');

export const certKind = () => (String(process.env.VERIFACTU_CERT_KIND || 'personal').toLowerCase() === 'sello' ? 'sello' : 'personal');

export const producerConfig = () => {
    const name = String(process.env.VERIFACTU_PRODUCER_NAME || '').trim();
    const nif = String(process.env.VERIFACTU_PRODUCER_NIF || '').trim().toUpperCase();
    const systemId = String(process.env.VERIFACTU_SYSTEM_ID || '01').trim();
    const version = String(process.env.VERIFACTU_SYSTEM_VERSION || '1.0.0').trim();
    const systemName = String(process.env.VERIFACTU_SYSTEM_NAME || 'Workly').trim();
    if (!name || nif.length !== 9 || systemId.length < 1 || systemId.length > 2) {
        const err = new Error('Falta la configuración del productor VeriFactu: VERIFACTU_PRODUCER_NAME, VERIFACTU_PRODUCER_NIF de 9 caracteres y VERIFACTU_SYSTEM_ID de 1 o 2 caracteres.');
        err.statusCode = 400;
        throw err;
    }
    return {
        name: name.slice(0, 120),
        nif,
        systemId,
        version: version.slice(0, 50),
        systemName: systemName.slice(0, 30),
    };
};

export const producerReady = () => {
    try {
        producerConfig();
        return true;
    } catch {
        return false;
    }
};

export const ENDPOINTS = {
    test: {
        personal: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
        sello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    },
    production: {
        personal: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
        sello: 'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    },
};

export const endpointFor = ({ env = verifactuEnv(), kind = certKind() } = {}) => {
    const zone = env === 'production' ? ENDPOINTS.production : ENDPOINTS.test;
    return kind === 'sello' ? zone.sello : zone.personal;
};
