// frontend/src/hooks/usePlanLimit.js
import { useState } from 'react';
import UpgradeModal from '../components/UpgradeModal';

/**
 * Hook para manejar límites de plan.
 * Uso:
 *   const { checkResponse, UpgradePrompt } = usePlanLimit();
 *   const res = await fetchWithAuth(...);
 *   if (!await checkResponse(res)) return; // muestra modal si es 403 upgrade
 */
export const usePlanLimit = () => {
    const [upgradeInfo, setUpgradeInfo] = useState(null);

    const checkResponse = async res => {
        if (res.status === 403) {
            try {
                const data = await res.clone().json();
                if (data.upgrade_required) {
                    setUpgradeInfo({ feature: data.feature, message: data.message });
                    return false;
                }
            } catch { /* ignorar */ }
        }
        return true;
    };

    const UpgradePrompt = upgradeInfo
        ? <UpgradeModal feature={upgradeInfo.feature} message={upgradeInfo.message} onClose={() => setUpgradeInfo(null)} />
        : null;

    return { checkResponse, UpgradePrompt };
};