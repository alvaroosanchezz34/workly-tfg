import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, test } from 'vitest';
import { Input } from '../components/FormComponents';
import Modal from '../components/Modal';

describe('accesibilidad de piezas comunes', () => {
    test('el error queda ligado al campo', async () => {
        const { container } = render(<Input label="Email" name="email" error="Falta el email" />);
        const field = screen.getByLabelText(/Email/);
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(field).toHaveAttribute('aria-describedby', 'email-error');
        expect(screen.getByRole('alert')).toHaveTextContent('Falta el email');
        expect(await axe(container)).toHaveNoViolations();
    });

    test('el diálogo tiene nombre y botón de cierre', async () => {
        const { container } = render(
            <Modal open title="Emitir factura" onClose={() => {}}>
                <p>Se asignará el número oficial.</p>
            </Modal>
        );
        expect(screen.getByRole('dialog', { name: 'Emitir factura' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
        expect(await axe(container)).toHaveNoViolations();
    });
});
