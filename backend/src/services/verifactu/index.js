import { NoOpVerifactuProvider } from './NoOpVerifactuProvider.js';
import { VerifactuProvider } from './VerifactuProvider.js';

const providers = {
    noop: () => new NoOpVerifactuProvider(),
};

export const getVerifactuProvider = () => {
    const name = (process.env.VERIFACTU_PROVIDER || 'noop').toLowerCase();
    const factory = providers[name];
    if (!factory) {
        const err = new Error(`Proveedor VeriFactu desconocido: ${name}. Usa VERIFACTU_PROVIDER=noop hasta enchufar uno real.`);
        err.statusCode = 500;
        throw err;
    }
    return factory();
};

export const registerVerifactuProvider = (name, factory) => {
    providers[String(name).toLowerCase()] = factory;
};

export { VerifactuProvider, NoOpVerifactuProvider };
