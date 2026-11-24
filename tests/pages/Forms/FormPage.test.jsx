import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, formPath } from '../../../src/constants/routes.js';
import {
  formFieldErrors as fieldErrors,
  formPageContent as content,
} from '../../../src/data/formPage.js';
import FormPage from '../../../src/pages/Forms/FormPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { enabledFieldCount } from '../../../src/utils/formFields.js';
import { apiFailure, apiPage, apiStub, reply } from '../../support/apiStub.js';
import { allForms, apiForm, formRoutes } from '../../support/fixtures/forms.js';
import {
  activePatients,
  apiPatient,
  patientRoutes,
} from '../../support/fixtures/patients.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const HOME_VISIT = '3c3086ad-9f4d-5f00-9bf4-7b1f33272a20';
const TRIAGE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';
const NEW_FORM = 'f0a10000-0000-5000-8000-000000000001';
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const ALZIRA_INACTIVE = 'a2cacec9-94ff-5eae-b091-c9448add206b';
const UPDATE = 'PATCH /forms/:formId';
const DRAFT = 'PUT /forms/:formId/draft';
const PUBLISH = 'POST /forms/:formId/publish';

// Rotas de formulário que acompanham as ações do teste: cada ação devolve
// o formulário como a API o deixaria. Nenhuma regra é conferida aqui; a
// API acrescenta a cada campo o id, a chave (nos novos) e a posição.
function formApi(forms = allForms()) {
  const known = new Map(forms.map((form) => [form.id, form]));
  let count = 0;
  const withIds = (fields) =>
    fields.map((field, position) => {
      count += 1;
      return {
        ...field,
        id: `campo-${count}`,
        fieldKey: field.fieldKey ?? `chave-${count}`,
        position,
      };
    });
  const change = (formId, changes) => {
    known.set(formId, { ...known.get(formId), ...changes });
    return { data: known.get(formId), meta: {} };
  };
  return {
    ...patientRoutes(),
    'GET /forms/:formId': ({ params }) =>
      known.has(params.formId)
        ? { data: known.get(params.formId), meta: {} }
        : apiFailure(404, 'FORM_NOT_FOUND', 'Formulário não encontrado.'),
    'POST /forms': ({ body: { fields, ...data } }) => {
      known.set(NEW_FORM, {
        ...apiForm(VITAL_SIGNS),
        ...data,
        id: NEW_FORM,
        status: 'draft',
        hasDraft: true,
        currentVersion: null,
        deactivatedAt: null,
        draft: { id: 'rascunho-novo', fields: withIds(fields) },
      });
      return reply(201, { data: known.get(NEW_FORM), meta: {} });
    },
    'PATCH /forms/:formId': ({ params, body }) => change(params.formId, body),
    [DRAFT]: ({ params, body }) =>
      change(params.formId, {
        hasDraft: true,
        draft: { id: 'rascunho', fields: withIds(body.fields) },
      }),
    [PUBLISH]: ({ params }) => {
      const { draft, currentVersion } = known.get(params.formId);
      return change(params.formId, {
        status: 'active',
        hasDraft: false,
        draft: null,
        currentVersion: {
          id: draft.id,
          number: (currentVersion?.number ?? 0) + 1,
          publishedAt: '2026-11-24T12:00:00.000Z',
          fieldCount: enabledFieldCount(draft.fields),
          fields: draft.fields,
        },
      });
    },
    'POST /forms/:formId/draft/discard': ({ params }) =>
      change(params.formId, { hasDraft: false, draft: null }),
    'POST /forms/:formId/deactivate': ({ params }) =>
      change(params.formId, {
        status: 'inactive',
        deactivatedAt: '2026-11-24T12:00:00.000Z',
      }),
    'POST /forms/:formId/reactivate': ({ params }) =>
      change(params.formId, { status: 'active', deactivatedAt: null }),
  };
}

function renderForm(path, profile = 'professional', forms = undefined) {
  if (profile !== 'caregiver') {
    apiStub().use(formApi(forms));
  }
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
    expect(router.state.location.pathname).toBe(formPath(NEW_FORM));
    const created = apiStub().last('POST /forms').body;
    expect(created.name).toBe('Curativos');
    expect(created.fields.map((field) => field.name)).toEqual([
      'Tamanho da ferida',
      'Aspecto',
    ]);
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
    const sent = apiStub().last(DRAFT);
    expect(sent.params.formId).toBe(VITAL_SIGNS);
    expect(
      sent.body.fields.find((field) => field.name === 'Frequência cardíaca')
        .requirement,
    ).toBe('required');
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
    expect(apiStub().last(PUBLISH)).toMatchObject({
      params: { formId: HOME_VISIT },
      body: { confirmImpact: true },
    });
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
    expect(apiStub().last('POST /forms/:formId/draft/discard').params).toEqual({
      formId: HOME_VISIT,
    });
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
    // A API manda à cuidadora o formulário sem o rascunho.
    apiStub().use({
      ...patientRoutes(),
      ...formRoutes([
        apiForm(VITAL_SIGNS, { hasDraft: false, draft: undefined }),
      ]),
    });
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
    // A API não mostra à cuidadora o formulário desativado.
    apiStub().use({
      ...patientRoutes(),
      'GET /forms/:formId': () =>
        apiFailure(404, 'FORM_NOT_FOUND', 'Formulário não encontrado.'),
    });
    renderForm(formPath(TRIAGE), 'caregiver');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });

  it('mantém no público, pelo nome, o paciente que não está na lista de ativos', async () => {
    // A Alzira ficou inativa depois de entrar no público: a lista de ativos
    // não a traz, e o nome vem da consulta dela.
    renderForm(formPath(HOME_VISIT), 'professional', [
      apiForm(HOME_VISIT, {
        audience: 'patients',
        patientIds: [DIRCE, ALZIRA_INACTIVE],
      }),
    ]);

    expect(
      await screen.findByText('Alzira Prates Monteiro'),
    ).toBeInTheDocument();
    // Tirar a Dirce do público não pode levar junto quem está fora da lista.
    const dirce = screen
      .getByText('Dirce Albuquerque Moraes')
      .closest('.MuiChip-root');
    fireEvent.click(within(dirce).getByTestId('CancelIcon'));
    fireEvent.click(screen.getByRole('button', { name: content.data.save }));

    expect(await screen.findByText(content.data.saved)).toBeInTheDocument();
    expect(apiStub().last(UPDATE).body.patientIds).toEqual([ALZIRA_INACTIVE]);
  });

  it('põe no público o paciente que só a busca na API acha', async () => {
    renderForm(formPath(HOME_VISIT), 'professional', [
      apiForm(HOME_VISIT, { audience: 'patients', patientIds: [DIRCE] }),
    ]);
    // A primeira página não traz o Osvaldo; a busca pelo nome traz.
    apiStub().use({
      'GET /patients': ({ query }) =>
        query.search
          ? apiPage([apiPatient(OSVALDO)])
          : apiPage(
              activePatients().filter((patient) => patient.id !== OSVALDO),
            ),
    });

    fireEvent.change(
      await screen.findByRole('combobox', { name: content.data.patients }),
      { target: { value: 'osval' } },
    );
    fireEvent.click(
      await screen.findByRole('option', { name: 'Osvaldo Teixeira Lins' }),
    );
    fireEvent.click(screen.getByRole('button', { name: content.data.save }));

    expect(await screen.findByText(content.data.saved)).toBeInTheDocument();
    expect(apiStub().last(UPDATE).body.patientIds).toEqual([DIRCE, OSVALDO]);
  });
});
