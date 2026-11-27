import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PATHS,
  patientPath,
  recordPath,
} from '../../../src/constants/routes.js';
import { visitRecordContent as content } from '../../../src/data/visitRecord.js';
import VisitPage from '../../../src/pages/FollowUps/VisitPage.jsx';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiFailure, apiPage, apiStub, reply } from '../../support/apiStub.js';
import { apiForm, formRoutes } from '../../support/fixtures/forms.js';
import {
  activePatients,
  apiPatient,
  patientRoutes,
} from '../../support/fixtures/patients.js';

const DIRCE = '0b639b83-76d0-570a-9017-7b6263d892cf';
const CLEUSA = '6d0a941f-2690-5190-928c-6b8f43771fe2';
const VITAL_SIGNS = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const DAILY = 'd9d5ba57-125a-506d-a026-be0c9dc2dad6';
const HOME_VISIT = '3c3086ad-9f4d-5f00-9bf4-7b1f33272a20';
const NEW_RECORD = 'f0120000-0000-5000-8000-000000000001';
const CREATE = 'POST /follow-ups';

// Formulários que a API diria valer para cada paciente; o stub não aplica
// a regra do público, só devolve a lista do teste.
const FORMS_FOR = {
  [CLEUSA]: [VITAL_SIGNS],
  [DIRCE]: [HOME_VISIT, DAILY],
};

function renderVisit(patientId, { width = 375 } = {}) {
  return renderPage(
    [
      { path: PATHS.PATIENT_VISIT, element: <VisitPage /> },
      { path: PATHS.PATIENT_DETAIL, element: <p>Detalhe do paciente</p> },
      { path: PATHS.RECORD_DETAIL, element: <p>Detalhe do registro</p> },
    ],
    { profile: 'caregiver', path: patientPath(patientId, 'visit'), width },
  );
}

function input(label) {
  return screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
}

async function chooseForm(name) {
  fireEvent.mouseDown(
    await screen.findByRole('combobox', { name: content.form }),
  );
  fireEvent.click(await screen.findByRole('option', { name }));
}

afterEach(() => {
  resetViewport();
});

beforeEach(() => {
  apiStub().use({
    ...patientRoutes(),
    ...formRoutes(),
    'GET /forms': ({ query }) =>
      apiPage((FORMS_FOR[query.patientId] ?? []).map((id) => apiForm(id))),
    [CREATE]: ({ body }) =>
      reply(201, { data: { id: NEW_RECORD, ...body }, meta: {} }),
  });
});

describe('VisitPage', () => {
  it('abre já escolhido o único formulário que vale para o paciente', async () => {
    renderVisit(CLEUSA);

    expect(
      await screen.findByRole('textbox', { name: /^Pressão sistólica/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sinais vitais', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: content.form })).toBeNull();
  });

  it('pede o formulário quando há mais de um e mostra os campos por seção, sem os desabilitados', async () => {
    renderVisit(DIRCE);

    await chooseForm('Visita HAS/DM2');

    for (const section of [
      'Sinais vitais',
      'Bem-estar',
      'Medicação',
      'Atividades',
    ]) {
      expect(
        await screen.findByRole('heading', { name: section, level: 2 }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByText('Peso')).toBeNull();
    expect(screen.getByRole('slider', { name: /Humor/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: content.yes }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regular' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Troca de curativo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Intercorrências' }),
    ).toBeInTheDocument();
  });

  it('começa a escala vazia, aceita valor e pode ser limpa', async () => {
    renderVisit(DIRCE);
    await chooseForm('Visita HAS/DM2');
    const slider = await screen.findByRole('slider', { name: /Humor/ });

    expect(slider).toHaveAttribute('aria-valuetext', content.notInformed);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByRole('slider', { name: /Humor/ })).toHaveAttribute(
      'aria-valuetext',
      '1',
    );
    fireEvent.click(
      screen.getByRole('button', { name: content.clear('Humor') }),
    );

    expect(screen.getByRole('slider', { name: /Humor/ })).toHaveAttribute(
      'aria-valuetext',
      content.notInformed,
    );
  });

  it('recusa o envio vazio e aponta o obrigatório que faltou', async () => {
    renderVisit(CLEUSA);
    await screen.findByRole('textbox', { name: /^Pressão sistólica/ });

    fireEvent.click(screen.getByRole('button', { name: content.save }));
    expect(await screen.findByText(content.errors.empty)).toBeInTheDocument();

    fireEvent.change(input('Pressão diastólica'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: content.save }));
    expect(
      await screen.findByText(content.fieldErrors.REQUIRED),
    ).toBeInTheDocument();
  });

  it('recusa casas decimais além das do campo e visita no futuro', async () => {
    renderVisit(CLEUSA);
    await screen.findByRole('textbox', { name: /^Pressão sistólica/ });

    fireEvent.change(input('Pressão sistólica'), { target: { value: '130' } });
    fireEvent.change(input('Pressão diastólica'), { target: { value: '80' } });
    fireEvent.change(input('Temperatura'), { target: { value: '36,55' } });
    fireEvent.change(screen.getByLabelText(content.visitedAt), {
      target: { value: '2999-01-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: content.save }));

    expect(
      await screen.findByText(content.fieldErrors.TOO_MANY_DECIMALS(1)),
    ).toBeInTheDocument();
    expect(screen.getByText(content.errors.future)).toBeInTheDocument();
  });

  it('conta 0 na escala e "não" como valores, salva e abre o registro', async () => {
    const router = renderVisit(DIRCE);
    await chooseForm('Acompanhamento diário');
    const pain = await screen.findByRole('slider', { name: /Dor/ });

    fireEvent.keyDown(pain, { key: 'Home' });
    fireEvent.click(screen.getByRole('button', { name: content.no }));
    fireEvent.click(screen.getByRole('button', { name: content.save }));

    expect(await screen.findByText('Detalhe do registro')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(recordPath(NEW_RECORD));
    expect(router.state.location.state).toEqual({ created: true });
    const { currentVersion } = apiForm(DAILY);
    const nameOf = (fieldId) =>
      currentVersion.fields.find((field) => field.id === fieldId).name;
    const sent = apiStub().last(CREATE).body;
    expect(sent).toMatchObject({
      patientId: DIRCE,
      formId: DAILY,
      formVersionId: currentVersion.id,
      notes: null,
    });
    // O campo vazio vai como `null`, que a API não conta como preenchido.
    expect(
      sent.answers.map((answer) => [nameOf(answer.fieldId), answer.value]),
    ).toEqual([
      ['Glicemia capilar', null],
      ['Dor', 0],
      ['Alimentou-se bem', false],
    ]);
  });

  it('pede para abrir de novo quando a API diz que o formulário mudou', async () => {
    apiStub().use({
      [CREATE]: () =>
        apiFailure(
          409,
          'FOLLOW_UP_FORM_VERSION_OUTDATED',
          'O formulário mudou. Abra de novo antes de enviar.',
        ),
    });
    renderVisit(CLEUSA);
    fireEvent.change(
      await screen.findByRole('textbox', { name: /^Pressão sistólica/ }),
      { target: { value: '130' } },
    );
    fireEvent.change(input('Pressão diastólica'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: content.save }));

    expect(
      await screen.findByText(content.errors.outdated),
    ).toBeInTheDocument();
    const forms = apiStub().requests.filter(
      (request) => request.key === 'GET /forms/:formId',
    ).length;
    fireEvent.click(
      screen.getByRole('button', { name: content.errors.reload }),
    );
    await waitFor(() =>
      expect(
        apiStub().requests.filter(
          (request) => request.key === 'GET /forms/:formId',
        ),
      ).toHaveLength(forms + 1),
    );
  });

  it('cancela sem gravar e volta ao paciente', async () => {
    const router = renderVisit(CLEUSA);
    fireEvent.change(
      await screen.findByRole('textbox', { name: /^Pressão sistólica/ }),
      { target: { value: '130' } },
    );

    fireEvent.click(screen.getByRole('button', { name: content.cancel }));

    expect(await screen.findByText('Detalhe do paciente')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(patientPath(CLEUSA));
    expect(apiStub().last(CREATE)).toBeUndefined();
  });

  it('diz que paciente inativo não recebe registro', async () => {
    apiStub().use(
      patientRoutes(activePatients(), [
        apiPatient(CLEUSA, { status: 'inactive' }),
      ]),
    );

    renderVisit(CLEUSA);

    expect(await screen.findByText(content.inactive)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: content.save })).toBeNull();
  });

  it('mostra Cancelar e Salvar presos ao pé da tela no celular', async () => {
    renderVisit(CLEUSA);
    const save = await screen.findByRole('button', { name: content.save });

    const bar = save.closest('.MuiPaper-root');
    await waitFor(() => expect(getComputedStyle(bar).position).toBe('sticky'));
    expect(
      within(bar).getByRole('button', { name: content.cancel }),
    ).toBeVisible();
  });

  it('deixa Cancelar e Salvar no fim do formulário no computador, sem cobrir os campos', async () => {
    renderVisit(CLEUSA, { width: 1440 });
    const save = await screen.findByRole('button', { name: content.save });

    const bar = save.closest('.MuiPaper-root');
    await waitFor(() => expect(getComputedStyle(bar).position).toBe('static'));
  });
});
