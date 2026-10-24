// Contrato del proveedor VeriFactu.
// La fase 1 no elige proveedor. Quien lo enchufe más adelante implementa estos cuatro métodos.
// registrarAlta y anular reciben la foto fiscal ya congelada de la factura.
// obtenerQr y obtenerEstado sirven para rellenar el PDF y para consultar un envío.

export class VerifactuProvider {
    async registrarAlta(_registro) {
        throw new Error('registrarAlta no está implementado en este proveedor');
    }

    async anular(_registro) {
        throw new Error('anular no está implementado en este proveedor');
    }

    async obtenerQr(_registro) {
        throw new Error('obtenerQr no está implementado en este proveedor');
    }

    async obtenerEstado(_idExterno) {
        throw new Error('obtenerEstado no está implementado en este proveedor');
    }
}
