import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { formListContent as content } from '../../../src/data/formList.js';
import FormListPage from '../../../src/pages/Forms/FormListPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

function renderList(profile = 'professional') {
  return renderPage([{ path: PATHS.FORMS, element: <FormListPage /> }], {
    profile,
    path: PATHS.FORMS,
  });
}

function items() {
  return within(
    screen.getByRole('list', { name: content.listLabel }),
  ).getAllByRole('listitem');
}

function item(name) {
  return items().find((element) =>
    within(element).queryByRole('link', { name }),
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('FormListPage', () => {
  it('lista os formulários com situação, versão, número de campos e rascunho pendente', async () => {
    renderList();

    await screen.findByText(content.count(6));
    expect(item('Visita HAS/DM2')).toHaveTextContent('Ativo');
    expect(item('Visita HAS/DM2')).toHaveTextContent('Versão 1 · 8 campos');
    expect(item('Visita HAS/DM2')).toHaveTextContent(content.pendingDraft);
    expect(item('Avaliação de bem-estar')).toHaveTextContent('Rascunho');
    expect(item('Avaliação de bem-estar')).toHaveTextContent(
      content.neverPublished,
    );
    expect(item('Sinais vitais')).toHaveTextContent('A cada 1 semana');
    expect(item('Monitoramento respiratório')).toHaveTextContent(
      content.patients(1),
    );
    expect(content.patients(1)).toBe('1 paciente selecionado');
    expect(content.patients(2)).toBe('2 pacientes selecionados');
    expect(item('Triagem de urgência')).toHaveTextContent('Inativo');
  });

  it('mostra "Novo formulário" só para quem cria formulários', async () => {
    renderList('professional');
    expect(
      await screen.findByRole('link', { name: content.newForm }),
    ).toHaveAttribute('href', PATHS.FORM_NEW);
  });

  it('filtra pelo nome e pela situação', async () => {
    renderList('admin');
    await screen.findByText(content.count(6));

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'triagem' },
    });
    await screen.findByText(content.count(1));
    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: '' },
    });
    await screen.findByText(content.count(6));
    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: content.statusLabel }),
    );
    fireEvent.click(await screen.findByRole('option', { name: 'Rascunho' }));

    await waitFor(() => expect(items()).toHaveLength(1));
    expect(items()[0]).toHaveTextContent('Avaliação de bem-estar');
  });

  it('dá à cuidadora só os ativos dos pacientes dela, em leitura e sem filtro de situação', async () => {
    renderList('caregiver');

    await screen.findByText(content.count(3));
    expect(screen.getByText(content.readOnly)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: content.newForm })).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: content.statusLabel }),
    ).toBeNull();
    expect(
      items().some((element) =>
        element.textContent.includes(content.pendingDraft),
      ),
    ).toBe(false);
  });
});
