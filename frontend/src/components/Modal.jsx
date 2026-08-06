import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MotionDiv = motion.div;

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <MotionDiv
                    className="modal-backdrop"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <MotionDiv
                        className={`modal-box${size === 'lg' ? ' modal-box-lg' : ''}`}
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, y: 24, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    >
                        <div className="modal-header">
                            <h3 className="modal-title">{title}</h3>
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