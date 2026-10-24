import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { FeedbackProvider, useFeedback } from '../context/FeedbackContext';

function Probe() {
    const { toast } = useFeedback();
    return <button type="button" onClick={() => toast('Factura emitida', 'success')}>Avisar</button>;
}

describe('avisos', () => {
    test('el toast se anuncia', () => {
        render(<FeedbackProvider><Probe /></FeedbackProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
        expect(screen.getByRole('status')).toHaveTextContent('Factura emitida');
    });
});
