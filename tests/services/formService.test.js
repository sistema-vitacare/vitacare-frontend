import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  createForm,
  deactivateForm,
  discardFormDraft,
  getForm,
  listForms,
  publishForm,
  reactivateForm,
  saveFormDraft,
  updateForm,
} from '../../src/services/formService.js';
import { apiFailure, apiPage, apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const FORM_ID = '8c0342e9-d9e9-58c2-a229-1c32168a8bf2';
const TOKEN = `token-${demoUser('professional').id}`;
const FORM = { id: FORM_ID, name: 'Formulário Exemplo', status: 'active' };
const FIELDS = [{ fieldKey: 'k1', name: 'Peso', fieldType: 'number' }];

const answer = ({ body }) => ({ data: { ...FORM, ...body }, meta: {} });

async function signIn() {
  await login(credentialsFor('professional'));
}

describe('formService', () => {
  it('lista pela API com os filtros da tela na query e o token da sessão', async () => {
    await signIn();
    apiStub().use({ 'GET /forms': () => apiPage([FORM]) });

    const { data } = await listForms({
      status: 'active',
      patientId: 'p1',
      search: undefined,
      limit: 100,
    });

    expect(data).toEqual([FORM]);
    expect(apiStub().last('GET /forms')).toMatchObject({
      query: { status: 'active', patientId: 'p1', limit: '100' },
      token: TOKEN,
    });
  });

  it('consulta, cria, edita os dados e salva o rascunho pelas rotas do formulário', async () => {
    await signIn();
    apiStub().use({
      'GET /forms/:formId': () => ({ data: FORM, meta: {} }),
      'POST /forms': answer,
      'PATCH /forms/:formId': answer,
      'PUT /forms/:formId/draft': answer,
    });

    await getForm(FORM_ID);
    await createForm({ name: 'Formulário Exemplo', fields: FIELDS });
    await updateForm(FORM_ID, { name: 'Outro nome' });
    await saveFormDraft(FORM_ID, { fields: FIELDS });

    expect(apiStub().last('GET /forms/:formId').params).toEqual({
      formId: FORM_ID,
    });
    expect(apiStub().last('POST /forms').body).toEqual({
      name: 'Formulário Exemplo',
      fields: FIELDS,
    });
    expect(apiStub().last('PATCH /forms/:formId')).toMatchObject({
      params: { formId: FORM_ID },
      body: { name: 'Outro nome' },
    });
    expect(apiStub().last('PUT /forms/:formId/draft')).toMatchObject({
      params: { formId: FORM_ID },
      body: { fields: FIELDS },
    });
  });

  it('publica com a confirmação de impacto, descarta o rascunho e muda a situação', async () => {
    await signIn();
    apiStub().use({
      'POST /forms/:formId/publish': answer,
      'POST /forms/:formId/draft/discard': answer,
      'POST /forms/:formId/deactivate': answer,
      'POST /forms/:formId/reactivate': answer,
    });

    await publishForm(FORM_ID, { confirmImpact: true });
    await discardFormDraft(FORM_ID);
    await deactivateForm(FORM_ID);
    await reactivateForm(FORM_ID);

    expect(apiStub().last('POST /forms/:formId/publish').body).toEqual({
      confirmImpact: true,
    });
    expect(
      [
        'POST /forms/:formId/draft/discard',
        'POST /forms/:formId/deactivate',
        'POST /forms/:formId/reactivate',
      ].map((route) => apiStub().last(route).params.formId),
    ).toEqual([FORM_ID, FORM_ID, FORM_ID]);
  });

  it('devolve o erro da API com o código, como a publicação sem a confirmação', async () => {
    await signIn();
    apiStub().use({
      'POST /forms/:formId/publish': () =>
        apiFailure(
          409,
          'FORM_IMPACT_CONFIRMATION_REQUIRED',
          'Confirme o impacto da nova versão.',
        ),
    });

    await expect(publishForm(FORM_ID, {})).rejects.toMatchObject({
      status: 409,
      code: 'FORM_IMPACT_CONFIRMATION_REQUIRED',
    });
  });

  it('escapa o id na rota, para um id do endereço não levar a outra rota', async () => {
    await signIn();

    await getForm('../users').catch(() => null);

    expect(apiStub().requests.at(-1).path).toBe('/forms/..%2Fusers');
  });
});
