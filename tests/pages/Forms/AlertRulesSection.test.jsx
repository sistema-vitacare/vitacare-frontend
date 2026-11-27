import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PATHS, formPath } from '../../../src/constants/routes.js';
import {
  alertRuleFieldErrors as fieldErrors,
  alertRuleDialogContent as dialogContent,
  alertRuleSectionContent as content,
} from '../../../src/data/alertRuleSection.js';
import FormPage from '../../../src/pages/Forms/FormPage.jsx';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiFailure, apiPage, apiStub } from '../../support/apiStub.js';
import {
  SATURATION_RULE,
  SYSTOLIC_RULE,
  TEMPERATURE,
  VITAL_SIGNS,
  alertRuleRoutes,
  allAlertRules,
  apiAlertRule,
} from '../../support/fixtures/alertRules.js';
import { formRoutes } from '../../support/fixtures/forms.js';
import {
  activePatients,
  apiPatient,
  patientRoutes,
} from '../../support/fixtures/patients.js';

const DAILY = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';
const WELL_BEING_DRAFT = 'fc78dd55-dd62-5075-bd49-995af47c3da7';
const TRIAGE_INACTIVE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';
const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const OSVALDO = '91fb0349-7fb0-5be9-ac72-eb28afa2b17e';
const IOLANDA = 'b07a6b59-2a82-5a9f-be9b-c41102749e06';
const FEVER_RULE = 'a1e70000-0000-5000-8000-000000000001';
const CREATE = 'POST /alert-rules';
const UPDATE = 'PATCH /alert-rules/:ruleId';
const DEACTIVATE = 'POST /alert-rules/:ruleId/deactivate';
const REACTIVATE = 'POST /alert-rules/:ruleId/reactivate';

// O que a API devolve na lista; o teste que grava muda esta lista, como a API
// faria, e a seção a pede de novo.
let alertRules;

function change(ruleId, changes) {
  const index = alertRules.findIndex(({ id }) => id === ruleId);
  alertRules[index] = { ...alertRules[index], ...changes };
  return { data: alertRules[index], meta: {} };
}

function renderForm(formId, profile = 'professional') {
  return renderPage([{ path: PATHS.FORM_DETAIL, element: <FormPage /> }], {
    profile,
    path: formPath(formId),
  });
}

function section() {
  return screen
    .getByRole('heading', { name: content.title })
    .closest('.MuiCard-root');
}

async function rules() {
  const list = await screen.findByRole('list', { name: content.listLabel });
  return within(list).getAllByRole('listitem');
}

// Depois de salvar, a lista recarrega: o item é procurado de novo.
async function rule(name) {
  const list = await screen.findByRole('list', { name: content.listLabel });
  return (await within(list).findByText(name)).closest('li');
}

function dialog() {
  return screen.getByRole('dialog');
}

function choose(label, option) {
  fireEvent.mouseDown(within(dialog()).getByRole('combobox', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function fill(label, value) {
  fireEvent.change(within(dialog()).getByLabelText(label, { exact: false }), {
    target: { value },
  });
}

/** Responde a criação com a regra de febre que a API gravaria. */
function createFever() {
  apiStub().use({
    [CREATE]: ({ body }) => {
      const created = apiAlertRule(
        FEVER_RULE,
        VITAL_SIGNS,
        TEMPERATURE,
        body.name,
        {
          operator: body.operator,
          referenceValue: body.referenceValue,
          severity: body.severity,
        },
      );
      alertRules.push(created);
      return { data: created, meta: {} };
    },
  });
}

async function fillFever() {
  choose(dialogContent.field, 'Temperatura (°C)');
  fill(dialogContent.name, 'Febre');
  choose(dialogContent.operator, 'maior ou igual a');
  fill(dialogContent.reference, '37,8');
  choose(dialogContent.severity, 'Atenção');
}

async function openNewRule(formId) {
  renderForm(formId);
  await rules();
  fireEvent.click(screen.getByRole('button', { name: content.add }));
  await screen.findByRole('dialog');
}

afterEach(() => {
  resetViewport();
});

beforeEach(() => {
  alertRules = allAlertRules();
  apiStub().use({
    ...patientRoutes(),
    ...formRoutes(),
    ...alertRuleRoutes(alertRules),
  });
});

describe('AlertRulesSection', () => {
  it('lista as regras do formulário com campo, condição, severidade, alcance e situação', async () => {
    renderForm(VITAL_SIGNS.id);

    // O formulário e as regras carregam em sequência; cada um tem a própria
    // espera, para que a máquina lenta não some as duas cargas nos 5 s.
    await screen.findByRole('heading', { level: 1, name: 'Sinais vitais' });
    expect(await rules()).toHaveLength(3);
    expect(apiStub().last('GET /alert-rules').query).toEqual({
      formId: VITAL_SIGNS.id,
      limit: '100',
    });
    const systolic = await rule('Pressão sistólica acima de 160');
    expect(
      within(systolic).getByText('Pressão sistólica maior que 160 mmHg'),
    ).toBeVisible();
    expect(within(systolic).getByText('Crítico')).toBeVisible();
    expect(within(systolic).getByText(content.everyone)).toBeVisible();
    const own = await rule('Saturação abaixo de 92');
    expect(
      within(own).getByText(content.onlyFor('Benedito Arruda Paiva')),
    ).toBeVisible();
    const inactive = await rule('Temperatura acima de 37,8');
    expect(within(inactive).getByText(content.status.inactive)).toBeVisible();
    expect(within(section()).getByText(content.rules)).toBeVisible();
  });

  it('não aparece para quem não configura regras', async () => {
    renderForm(VITAL_SIGNS.id, 'caregiver');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sinais vitais' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: content.title }),
    ).not.toBeInTheDocument();
    expect(apiStub().last('GET /alert-rules')).toBeUndefined();
  });

  it('cria a regra geral, com os campos inválidos destacados antes', async () => {
    createFever();
    await openNewRule(VITAL_SIGNS.id);

    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    expect(
      within(dialog()).getByText(dialogContent.invalidFields),
    ).toBeVisible();
    expect(
      within(dialog()).getByText(fieldErrors.fieldKey.default),
    ).toBeVisible();
    expect(
      within(dialog()).getByText(fieldErrors.referenceValue.default),
    ).toBeVisible();
    expect(apiStub().last(CREATE)).toBeUndefined();

    await fillFever();
    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    expect(await screen.findByText(content.saved)).toBeVisible();
    expect(apiStub().last(CREATE).body).toEqual({
      formId: VITAL_SIGNS.id,
      fieldKey: TEMPERATURE.key,
      patientId: null,
      name: 'Febre',
      description: null,
      operator: 'gte',
      referenceValue: 37.8,
      severity: 'warning',
    });
    expect(
      within(await rule('Febre')).getByText(
        'Temperatura maior ou igual a 37,8 °C',
      ),
    ).toBeVisible();
  });

  it('oferece os pacientes ativos do público, mesmo os fora da primeira página', async () => {
    // Osvaldo está no público e além da primeira página; Iolanda, no
    // público e inativa.
    apiStub().use(
      patientRoutes(
        activePatients().filter(
          (patient) => ![OSVALDO, IOLANDA].includes(patient.id),
        ),
        [apiPatient(OSVALDO), apiPatient(IOLANDA, { status: 'inactive' })],
      ),
    );
    await openNewRule(DAILY);
    fireEvent.mouseDown(
      within(dialog()).getByRole('combobox', { name: dialogContent.patient }),
    );

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      dialogContent.everyone,
      'Dirce Albuquerque Moraes',
      'Osvaldo Teixeira Lins',
    ]);
  });

  it('busca na API o paciente que não coube na primeira página do público da organização', async () => {
    createFever();
    const firstPage = activePatients().filter(
      (patient) => patient.id !== DIRCE,
    );
    apiStub().use({
      'GET /patients': ({ query }) =>
        apiPage(query.search ? [apiPatient(DIRCE)] : firstPage),
    });
    await openNewRule(VITAL_SIGNS.id);
    await fillFever();

    // Quem digita está com o foco no campo; sem ele, o Autocomplete volta o
    // texto ao valor escolhido a cada render.
    const patient = within(dialog()).getByRole('combobox', {
      name: dialogContent.patient,
    });
    act(() => patient.focus());
    fireEvent.change(patient, { target: { value: 'Dirce' } });
    fireEvent.click(
      await screen.findByRole('option', { name: 'Dirce Albuquerque Moraes' }),
    );
    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    expect(await screen.findByText(content.saved)).toBeVisible();
    expect(
      apiStub().requests.find((request) => request.query.search),
    ).toMatchObject({ query: { search: 'Dirce', limit: '100' } });
    expect(apiStub().last(CREATE).body.patientId).toBe(DIRCE);
  });

  it('edita com campo e paciente fixos, enviando só o que mudou', async () => {
    apiStub().use({
      [UPDATE]: ({ params, body }) => change(params.ruleId, body),
    });
    renderForm(VITAL_SIGNS.id);
    await rules();

    fireEvent.click(
      within(await rule('Pressão sistólica acima de 160')).getByRole('button', {
        name: content.editOf('Pressão sistólica acima de 160'),
      }),
    );
    await screen.findByRole('dialog');
    const save = within(dialog()).getByRole('button', {
      name: dialogContent.save,
    });

    expect(
      within(dialog()).getByRole('combobox', { name: dialogContent.field }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(dialog()).getByRole('combobox', { name: dialogContent.patient }),
    ).toBeDisabled();
    expect(save).toBeDisabled();
    fill(dialogContent.reference, '170');
    fireEvent.click(save);

    expect(await screen.findByText(content.saved)).toBeVisible();
    expect(apiStub().last(UPDATE)).toMatchObject({
      params: { ruleId: SYSTOLIC_RULE },
      body: { referenceValue: 170 },
    });
    expect(Object.keys(apiStub().last(UPDATE).body)).toEqual([
      'referenceValue',
    ]);
    expect(
      within(await rule('Pressão sistólica acima de 160')).getByText(
        'Pressão sistólica maior que 170 mmHg',
      ),
    ).toBeVisible();
  });

  it('inativa com confirmação e reativa', async () => {
    apiStub().use({
      [DEACTIVATE]: ({ params }) =>
        change(params.ruleId, {
          status: 'inactive',
          deactivatedAt: '2026-11-25T13:00:00.000Z',
        }),
      [REACTIVATE]: ({ params }) =>
        change(params.ruleId, { status: 'active', deactivatedAt: null }),
    });
    renderForm(VITAL_SIGNS.id);
    await rules();

    fireEvent.click(
      within(await rule('Saturação abaixo de 92')).getByRole('button', {
        name: content.deactivateOf('Saturação abaixo de 92'),
      }),
    );
    const confirm = await screen.findByRole('dialog');
    expect(
      within(confirm).getByText(content.deactivateDialog.text),
    ).toBeVisible();
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    expect(await screen.findByText(content.deactivated)).toBeVisible();
    expect(apiStub().last(DEACTIVATE).params.ruleId).toBe(SATURATION_RULE);
    // O botão de reativar só existe na regra inativa.
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.reactivateOf('Saturação abaixo de 92'),
      }),
    );
    expect(await screen.findByText(content.reactivated)).toBeVisible();
    expect(apiStub().last(REACTIVATE).params.ruleId).toBe(SATURATION_RULE);
  });

  it('fecha a confirmação, recarrega as regras e avisa quando outra pessoa já inativou a regra', async () => {
    apiStub().use({
      [DEACTIVATE]: ({ params }) => {
        // Outra pessoa inativou a regra antes da confirmação.
        const index = alertRules.findIndex(({ id }) => id === params.ruleId);
        alertRules[index] = { ...alertRules[index], status: 'inactive' };
        return apiFailure(
          409,
          'ALERT_RULE_ALREADY_INACTIVE',
          'A regra já está inativa.',
        );
      },
    });
    renderForm(VITAL_SIGNS.id);
    await rules();

    fireEvent.click(
      within(await rule('Saturação abaixo de 92')).getByRole('button', {
        name: content.deactivateOf('Saturação abaixo de 92'),
      }),
    );
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    const notice = await screen.findByText(
      content.errors.ALERT_RULE_ALREADY_INACTIVE,
    );
    expect(notice.closest('.MuiAlert-root')).toHaveClass(
      'MuiAlert-colorWarning',
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      await within(await rule('Saturação abaixo de 92')).findByRole('button', {
        name: content.reactivateOf('Saturação abaixo de 92'),
      }),
    ).toBeVisible();
  });

  it('outro erro da inativação continua na confirmação, sem recarregar', async () => {
    apiStub().use({
      [DEACTIVATE]: () => apiFailure(500, 'INTERNAL_ERROR', 'Erro interno.'),
    });
    renderForm(VITAL_SIGNS.id);
    await rules();

    fireEvent.click(
      within(await rule('Saturação abaixo de 92')).getByRole('button', {
        name: content.deactivateOf('Saturação abaixo de 92'),
      }),
    );
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: content.deactivateDialog.confirm,
      }),
    );

    expect(await within(confirm).findByText(content.unexpected)).toBeVisible();
  });

  it('pede a publicação no formulário em rascunho', async () => {
    renderForm(WELL_BEING_DRAFT);
    expect(await screen.findByText(content.notPublished)).toBeVisible();
    expect(screen.queryByRole('button', { name: content.add })).toBeNull();
  });

  it('não aceita regra nova no formulário desativado', async () => {
    renderForm(TRIAGE_INACTIVE);

    expect(await screen.findByText(content.inactiveForm)).toBeVisible();
    expect(await screen.findByText(content.empty)).toBeVisible();
    expect(screen.queryByRole('button', { name: content.add })).toBeNull();
  });
});
