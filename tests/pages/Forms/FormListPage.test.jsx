import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS } from '../../../src/constants/routes.js';
import { formListContent as content } from '../../../src/data/formList.js';
import FormListPage from '../../../src/pages/Forms/FormListPage.jsx';
import { apiPage, apiStub } from '../../support/apiStub.js';
import { allForms, apiForm, formRoutes } from '../../support/fixtures/forms.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { prefixesOf, typeLikeBrowser } from '../../support/browserTyping.js';

const LIST = 'GET /forms';
const TRIAGE = 'Triagem de urgência';

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
  resetViewport();
});

describe('FormListPage', () => {
  it('lista os formulários com situação, versão, número de campos e rascunho pendente', async () => {
    apiStub().use(formRoutes());
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
    expect(item(TRIAGE)).toHaveTextContent('Inativo');
    expect(apiStub().last(LIST).query).toEqual({ page: '1', limit: '20' });
  });

  it('mostra "Novo formulário" só para quem cria formulários', async () => {
    apiStub().use(formRoutes());
    renderList('professional');
    expect(
      await screen.findByRole('link', { name: content.newForm }),
    ).toHaveAttribute('href', PATHS.FORM_NEW);
  });

  it('pede à API o nome e a situação filtrados e mostra o que ela devolve', async () => {
    const triage = allForms().filter((form) => form.name === TRIAGE);
    const drafts = allForms().filter((form) => form.status === 'draft');
    apiStub().use({
      [LIST]: ({ query }) =>
        apiPage(query.search ? triage : query.status ? drafts : allForms()),
    });
    renderList('admin');
    await screen.findByText(content.count(6));

    fireEvent.change(screen.getByLabelText(content.searchLabel), {
      target: { value: 'triagem' },
    });
    await screen.findByText(content.count(1));
    expect(apiStub().last(LIST).query).toMatchObject({ search: 'triagem' });
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
    expect(apiStub().last(LIST).query).toEqual({
      status: 'draft',
      page: '1',
      limit: '20',
    });
  });

  it('guarda no campo cada letra da busca na hora em que ela entra e manda o texto inteiro à API', async () => {
    apiStub().use({ [LIST]: () => apiPage(allForms()) });
    renderList('admin');
    await screen.findByText(content.count(6));

    const field = screen.getByLabelText(content.searchLabel);
    expect(typeLikeBrowser(field, 'Fictícia')).toEqual(prefixesOf('Fictícia'));
    await waitFor(() =>
      expect(apiStub().last(LIST).query.search).toBe('Fictícia'),
    );
  });

  it('dá à cuidadora o que a API devolve, em leitura e sem filtro de situação', async () => {
    // A API dá à cuidadora só os ativos dos pacientes dela, sem rascunho.
    const active = allForms()
      .filter((form) => form.status === 'active')
      .slice(0, 3)
      .map((form) => apiForm(form.id, { hasDraft: false, draft: undefined }));
    apiStub().use(formRoutes(active));
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
