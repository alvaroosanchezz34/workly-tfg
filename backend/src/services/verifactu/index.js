import { AeatVerifactuProvider } from './AeatVerifactuProvider.js';
import { NoOpVerifactuProvider } from './NoOpVerifactuProvider.js';
import { VerifactuProvider } from './VerifactuProvider.js';

const providers = {
    noop: () => new NoOpVerifactuProvider(),
    aeat: () => new AeatVerifactuProvider(),
};

export const getVerifactuProvider = () => {
    const name = (process.env.VERIFACTU_PROVIDER || 'noop').toLowerCase();
    const factory = providers[name];
    if (!factory) {
        const err = new Error(`Proveedor VeriFactu desconocido: ${name}. Usa noop o aeat.`);
        err.statusCode = 500;
        throw err;
    }
    return factory();
};

export const registerVerifactuProvider = (name, factory) => {
    providers[String(name).toLowerCase()] = factory;
};

export { VerifactuProvider, NoOpVerifactuProvider, AeatVerifactuProvider };
