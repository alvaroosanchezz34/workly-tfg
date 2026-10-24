const WEAK = new Set([
    'cambia_esto_por_un_string_secreto_largo_y_aleatorio',
    'otro_string_diferente_igual_de_largo_y_secreto',
    'secret',
    'changeme',
]);

export const assertProductionSecrets = () => {
    if (process.env.NODE_ENV !== 'production') return;
    const access = process.env.JWT_SECRET || '';
    const refresh = process.env.JWT_REFRESH_SECRET || '';
    const problems = [];
    if (access.length < 32 || WEAK.has(access)) problems.push('JWT_SECRET debe tener al menos 32 caracteres y no ser el del ejemplo');
    if (refresh.length < 32 || WEAK.has(refresh)) problems.push('JWT_REFRESH_SECRET debe tener al menos 32 caracteres y no ser el del ejemplo');
    if (access && access === refresh) problems.push('JWT_SECRET y JWT_REFRESH_SECRET tienen que ser distintos');
    if (!process.env.DB_PASSWORD) problems.push('DB_PASSWORD está vacío');
    if (problems.length) {
        throw new Error(`Configuración insegura: ${problems.join('. ')}`);
    }
};
