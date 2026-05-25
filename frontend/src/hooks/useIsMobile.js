// frontend/src/hooks/useIsMobile.js
import { useState, useEffect } from 'react';

/**
 * Devuelve true si el viewport es <= breakpoint (default 768px).
 * Se actualiza en resize con debounce ligero.
 */
export default function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(
        () => window.innerWidth <= breakpoint
    );

    useEffect(() => {
        let timer;
        const check = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setIsMobile(window.innerWidth <= breakpoint), 80);
        };
        window.addEventListener('resize', check);
        return () => {
            window.removeEventListener('resize', check);
            clearTimeout(timer);
        };
    }, [breakpoint]);

    return isMobile;
}