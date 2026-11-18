import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, formPath } from '../../../src/constants/routes.js';
import {
  alertRuleFieldErrors as fieldErrors,
  alertRuleDialogContent as dialogContent,
  alertRuleSectionContent as content,
} from '../../../src/data/alertRuleSection.js';
import FormPage from '../../../src/pages/Forms/FormPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const DAILY = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';
const WELL_BEING_DRAFT = 'fc78dd55-dd62-5075-bd49-995af47c3da7';
const TRIAGE_INACTIVE = '1ed79d8c-e5ae-5629-a92d-7e74d66bd81a';

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

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('AlertRulesSection', () => {
  it('lista as regras do formulário com campo, condição, severidade, alcance e situação', async () => {
    renderForm(VITAL_SIGNS);

    expect(await rules()).toHaveLength(3);
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
    renderForm(VITAL_SIGNS, 'caregiver');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sinais vitais' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: content.title }),
    ).not.toBeInTheDocument();
  });

  it('cria a regra geral, com os campos inválidos destacados antes', async () => {
    renderForm(VITAL_SIGNS);
    await rules();

    fireEvent.click(screen.getByRole('button', { name: content.add }));
    await screen.findByRole('dialog');
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

    choose(dialogContent.field, 'Temperatura (°C)');
    fireEvent.change(
      within(dialog()).getByLabelText(dialogContent.name, { exact: false }),
      { target: { value: 'Febre' } },
    );
    choose(dialogContent.operator, 'maior ou igual a');
    fireEvent.change(
      within(dialog()).getByLabelText(dialogContent.reference, {
        exact: false,
      }),
      { target: { value: '37,8' } },
    );
    choose(dialogContent.severity, 'Atenção');
    fireEvent.click(
      within(dialog()).getByRole('button', { name: dialogContent.save }),
    );

    expect(await screen.findByText(content.saved)).toBeVisible();
    expect(
      within(await rule('Febre')).getByText(
        'Temperatura maior ou igual a 37,8 °C',
      ),
    ).toBeVisible();
  });

  it('oferece só os pacientes do público do formulário para a regra própria', async () => {
    renderForm(DAILY);
    await rules();

    fireEvent.click(screen.getByRole('button', { name: content.add }));
    await screen.findByRole('dialog');
    fireEvent.mouseDown(
      within(dialog()).getByRole('combobox', { name: dialogContent.patient }),
    );

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      dialogContent.everyone,
      'Dirce Albuquerque Moraes',
      'Iolanda Ferraz',
      'Osvaldo Teixeira Lins',
    ]);
  });

  it('edita com campo e paciente fixos e o Salvar só depois de uma mudança', async () => {
    renderForm(VITAL_SIGNS);
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
    expect(save).toBeDisabled();
    fireEvent.change(
      within(dialog()).getByLabelText(dialogContent.reference, {
        exact: false,
      }),
      { target: { value: '170' } },
    );
    fireEvent.click(save);

    expect(await screen.findByText(content.saved)).toBeVisible();
    expect(
      within(await rule('Pressão sistólica acima de 160')).getByText(
        'Pressão sistólica maior que 170 mmHg',
      ),
    ).toBeVisible();
  });

  it('inativa com confirmação e reativa', async () => {
    renderForm(VITAL_SIGNS);
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
    // O botão de reativar só existe na regra inativa.
    fireEvent.click(
      await screen.findByRole('button', {
        name: content.reactivateOf('Saturação abaixo de 92'),
      }),
    );
    expect(await screen.findByText(content.reactivated)).toBeVisible();
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
