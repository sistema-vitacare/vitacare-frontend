import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, formPath } from '../../../src/constants/routes.js';
import {
  formFieldErrors as fieldErrors,
  formPageContent as content,
} from '../../../src/data/formPage.js';
import FormPage from '../../../src/pages/Forms/FormPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const HOME_VISIT = '3c3086ad-9f4d-5f00-9bf4-7b1f33272a20';
const TRIAGE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';

function renderForm(path, profile = 'professional') {
  return renderPage(
    [
      { path: PATHS.FORM_NEW, element: <FormPage /> },
      { path: PATHS.FORM_DETAIL, element: <FormPage /> },
      { path: PATHS.FORMS, element: <p>Lista</p> },
    ],
    { profile, path },
  );
}

async function choose(label, option, container = document.body) {
  fireEvent.mouseDown(within(container).getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

function dialog() {
  return screen.getByRole('dialog');
}

async function addField({ name, type, extra = () => {} }) {
  fireEvent.click(screen.getByRole('button', { name: content.fields.add }));
  await screen.findByRole('dialog', { name: content.dialog.newTitle });
  fireEvent.change(
    within(dialog()).getByLabelText(content.dialog.name, { exact: false }),
    {
      target: { value: name },
    },
  );
  if (type) {
    await choose(content.dialog.fieldType, type, dialog());
  }
  extra();
  fireEvent.click(
    within(dialog()).getByRole('button', { name: content.dialog.confirm }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('FormPage', () => {
  it('cria o formulário com os campos e salva o rascunho', async () => {
    const router = renderForm(PATHS.FORM_NEW);

    fireEvent.change(
      await screen.findByLabelText(content.data.name, { exact: false }),
      { target: { value: 'Curativos' } },
    );
    await addField({ name: 'Tamanho da ferida' });
    await addField({
      name: 'Aspecto',
      type: 'Escolha única',
      extra: () =>
        fireEvent.change(
          within(dialog()).getByLabelText(content.dialog.options),
          {
            target: { value: 'Limpa\nCom secreção' },
          },
        ),
    });
    fireEvent.click(
      screen.getByRole('button', { name: content.fields.saveDraft }),
    );

    expect(
      await screen.findByText(content.fields.draftSaved),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/formularios\/f0a10000-/);
    expect(screen.getByText('Tamanho da ferida')).toBeInTheDocument();
    expect(
      screen.getByText('Escolha única · Limpa, Com secreção'),
    ).toBeInTheDocument();
  });

  it('pede no diálogo as propriedades de cada tipo de campo', async () => {
    renderForm(PATHS.FORM_NEW);
    fireEvent.click(
      await screen.findByRole('button', { name: content.fields.add }),
    );
    await screen.findByRole('dialog');

    expect(
      within(dialog()).getByLabelText(content.dialog.unit),
    ).toBeInTheDocument();
    await choose(content.dialog.fieldType, 'Escala', dialog());
    expect(
      within(dialog()).getByLabelText(content.dialog.scaleMin),
    ).toBeInTheDocument();
    expect(within(dialog()).queryByLabelText(content.dialog.unit)).toBeNull();
    for (const type of ['Sim ou não', 'Texto']) {
      await choose(content.dialog.fieldType, type, dialog());
      expect(
        within(dialog()).queryByLabelText(content.dialog.scaleMin),
      ).toBeNull();
      expect(
        within(dialog()).queryByLabelText(content.dialog.options),
      ).toBeNull();
    }
    await choose(content.dialog.fieldType, 'Múltipla escolha', dialog());
    expect(
      within(dialog()).getByLabelText(content.dialog.options),
    ).toBeInTheDocument();
  });

  it('recusa no diálogo o nome repetido e a escala invertida', async () => {
    renderForm(formPath(VITAL_SIGNS));
    fireEvent.click(
      await screen.findByRole('button', { name: content.fields.add }),
    );
    await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog()).getByLabelText(content.dialog.name, { exact: false }),
      { target: { value: 'temperatura' } },
    );
    await choose(content.dialog.fieldType, 'Escala', dialog());
    fireEvent.change(within(dialog()).getByLabelText(content.dialog.scaleMin), {
      target: { value: '5' },
    });
    fireEvent.change(within(dialog()).getByLabelText(content.dialog.scaleMax), {
      target: { value: '1' },
    });

    fireEvent.click(
      within(dialog()).getByRole('button', { name: content.dialog.confirm }),
    );

    expect(
      within(dialog()).getByText(fieldErrors.name.duplicate),
    ).toBeInTheDocument();
    expect(
      within(dialog()).getByText(fieldErrors.scaleMax.invalidRange),
    ).toBeInTheDocument();
  });

  it('não salva formulário novo sem nome nem campos', async () => {
    renderForm(PATHS.FORM_NEW);

    fireEvent.click(
      await screen.findByRole('button', { name: content.fields.saveDraft }),
    );

    expect(await screen.findByText(content.errors.empty)).toBeInTheDocument();
    expect(screen.getByText(fieldErrors.name.required)).toBeInTheDocument();
  });

  it('muda a obrigatoriedade, salva o rascunho e libera a publicação', async () => {
    renderForm(formPath(VITAL_SIGNS));
    const group = await screen.findByRole('group', {
      name: content.fields.requirementLabel('Frequência cardíaca'),
    });

    expect(
      screen.getByRole('button', { name: content.fields.publish }),
    ).toBeDisabled();
    fireEvent.click(within(group).getByRole('button', { name: 'Obrigatório' }));
    expect(await screen.findByText(content.fields.unsaved)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: content.fields.saveDraft }),
    );

    expect(
      await screen.findByText(content.fields.draftSaved),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: content.fields.publish }),
    ).toBeEnabled();
  });

  it('publica sobre a versão vigente só depois de confirmar o impacto', async () => {
    renderForm(formPath(HOME_VISIT));

    fireEvent.click(
      await screen.findByRole('button', { name: content.fields.publish }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: content.publishDialog.title(2),
    });
    expect(confirm).toHaveTextContent(content.publishDialog.text(1));
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: content.publishDialog.confirm,
      }),
    );

    expect(
      await screen.findByText(content.fields.published(2)),
    ).toBeInTheDocument();
  });

  it('descarta o rascunho pendente e volta aos campos da versão vigente', async () => {
    renderForm(formPath(HOME_VISIT));
    await screen.findByText('Qualidade do sono');

    fireEvent.click(
      screen.getByRole('button', { name: content.fields.discard }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: content.discardDialog.title,
    });
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: content.discardDialog.confirm,
      }),
    );

    expect(
      await screen.findByText(content.fields.discarded),
    ).toBeInTheDocument();
    expect(screen.queryByText('Qualidade do sono')).toBeNull();
  });

  it('desativa e reativa o formulário, sem edição enquanto desativado', async () => {
    renderForm(formPath(VITAL_SIGNS));

    fireEvent.click(
      await screen.findByRole('button', { name: content.actions.deactivate }),
    );
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    expect(
      await screen.findByText(/Formulário desativado em/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: content.fields.saveDraft }),
    ).toBeNull();
    // O resto da tela volta à árvore de acessibilidade quando o diálogo fecha.
    fireEvent.click(
      await screen.findByRole('button', { name: content.actions.reactivate }),
    );
    fireEvent.click(
      within(
        await screen.findByRole('dialog', {
          name: content.reactivateDialog.title,
        }),
      ).getByRole('button', { name: content.reactivateDialog.confirm }),
    );
    expect(
      await screen.findByRole('button', { name: content.fields.saveDraft }),
    ).toBeInTheDocument();
  });

  it('mostra à cuidadora o formulário em leitura, sem ações', async () => {
    renderForm(formPath(VITAL_SIGNS), 'caregiver');

    expect(await screen.findByText('Frequência cardíaca')).toBeInTheDocument();
    expect(screen.getAllByText('Obrigatório')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: content.fields.saveDraft }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: content.actions.deactivate }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: content.fields.add }),
    ).toBeNull();
  });

  it('diz à cuidadora que o formulário desativado não foi encontrado', async () => {
    renderForm(formPath(TRIAGE), 'caregiver');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });
});
