import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MotionDiv = motion.div;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
    const titleId = useId();
    const boxRef = useRef(null);
    const reduce = prefersReducedMotion();

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        const timer = setTimeout(() => boxRef.current?.focus(), 0);
        const onKey = (event) => {
            if (event.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', onKey);
            if (previous && previous.focus) previous.focus();
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <MotionDiv
                    className="modal-backdrop"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18 }}
                >
                    <MotionDiv
                        ref={boxRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        className={`modal-box${size === 'lg' ? ' modal-box-lg' : ''}`}
                        onClick={e => e.stopPropagation()}
                        initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 28 }}
                    >
                        <div className="modal-header">
                            <h3 id={titleId} className="modal-title">{title}</h3>
                            <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                                <X size={14}/>
                            </button>
                        </div>
                        <div className="modal-body">{children}</div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

export default Modal;