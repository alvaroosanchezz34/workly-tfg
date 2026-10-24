import { useEffect } from 'react';

export default function SkipLink() {
    useEffect(() => {
        const mark = () => {
            document.querySelectorAll('main.page-content, main').forEach((el, index) => {
                if (!el.id && index === 0) el.id = 'contenido';
            });
        };
        mark();
        const observer = new MutationObserver(mark);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return <a className="skip-link" href="#contenido">Saltar al contenido</a>;
}
