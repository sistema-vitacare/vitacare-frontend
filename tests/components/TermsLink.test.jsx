import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppShell from '../../src/components/AppShell.jsx';
import TermsLink from '../../src/components/TermsLink.jsx';
import { termsLinkContent } from '../../src/data/terms.js';
import { renderPage } from '../support/renderPage.jsx';

describe('TermsLink', () => {
  it('leva à página pública do termo na origem da API, em outra aba', () => {
    render(<TermsLink />);

    const link = screen.getByRole('link', { name: termsLinkContent.label });
    expect(link).toHaveAttribute('href', 'http://api.test/termos');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('fica no rodapé de toda tela autenticada, fora do conteúdo', async () => {
    renderPage(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [{ index: true, element: <p>Conteúdo da tela</p> }],
        },
      ],
      { profile: 'caregiver', path: '/' },
    );

    const footer = await screen.findByRole('contentinfo');
    expect(
      within(footer).getByRole('link', { name: termsLinkContent.label }),
    ).toHaveAttribute('href', 'http://api.test/termos');
    expect(
      within(screen.getByRole('main')).queryByRole('link', {
        name: termsLinkContent.label,
      }),
    ).not.toBeInTheDocument();
  });
});
