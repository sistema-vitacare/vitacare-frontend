import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PatientStatusChip from '../../src/components/PatientStatusChip.jsx';

describe('PatientStatusChip', () => {
  it.each([
    ['active', 'Ativo'],
    ['inactive', 'Inativo'],
  ])('mostra a situação %s como %s', (status, label) => {
    render(<PatientStatusChip status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
