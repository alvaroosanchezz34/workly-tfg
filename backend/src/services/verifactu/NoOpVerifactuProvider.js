import { VerifactuProvider } from './VerifactuProvider.js';

// Proveedor de relleno. No habla con la AEAT y no inventa un QR.
// El PDF solo pinta el QR y la leyenda cuando un proveedor real los devuelve.

export class NoOpVerifactuProvider extends VerifactuProvider {
    async registrarAlta(registro) {
        return {
            status: 'not_configured',
            externalId: null,
            qrUrl: null,
            legend: null,
            registro,
        };
    }

    async anular(registro) {
        return {
            status: 'not_configured',
            externalId: null,
            registro,
        };
    }

    async obtenerQr(_registro) {
        return { qrUrl: null, legend: null };
    }

    async obtenerEstado(_idExterno) {
        return { status: 'not_configured' };
    }
}
