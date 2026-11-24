// Formulários dos dados simulados no formato da API (`forms-listar.md` e
// `forms-consultar.md`), como o administrador e o profissional os recebem,
// para os testes das telas que leem formulários. Os ids são os dos dados
// simulados, que os serviços ainda simulados conhecem. Nenhuma regra do
// backend é aplicada: o teste diz a lista que a API devolveria. Sai com os
// dados simulados (FE-65 do INTEGRACAO.md).
import { forms } from '../../../src/data/mocks/forms.js';
import { enabledFieldCount } from '../../../src/utils/formFields.js';
import { apiFailure, apiPage } from '../apiStub.js';

function currentVersion(form) {
  const version = form.versions.at(-1);
  return version
    ? {
        id: version.id,
        number: version.number,
        publishedAt: version.publishedAt,
        fieldCount: enabledFieldCount(version.fields),
        fields: version.fields,
      }
    : null;
}

/** Formulário como o detalhe da API o devolve, com `changes` por cima. */
export function apiForm(id, changes = {}) {
  const { versions, ...form } = forms.find((item) => item.id === id);
  return {
    ...form,
    hasDraft: form.draft !== null,
    currentVersion: currentVersion({ versions }),
    ...changes,
  };
}

/** Formulários dos dados simulados, por nome, como a lista padrão da API. */
export function allForms() {
  return [...forms]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((form) => apiForm(form.id));
}

// Na listagem, a API manda o resumo: a versão vigente sem os campos e
// nenhum rascunho.
function summary(form) {
  const listed = { ...form };
  delete listed.draft;
  if (listed.currentVersion) {
    listed.currentVersion = { ...listed.currentVersion };
    delete listed.currentVersion.fields;
  }
  return listed;
}

/**
 * Rotas de formulários: a lista responde o resumo de `list`; o detalhe, o
 * formulário de `list` e, fora dela, o dos dados simulados.
 */
export function formRoutes(list = allForms()) {
  return {
    'GET /forms': ({ query }) =>
      apiPage(list.map(summary), { limit: Number(query.limit ?? 20) }),
    'GET /forms/:formId': ({ params }) => {
      const form =
        list.find((item) => item.id === params.formId) ??
        (forms.some((item) => item.id === params.formId)
          ? apiForm(params.formId)
          : null);
      return form
        ? { data: form, meta: {} }
        : apiFailure(404, 'FORM_NOT_FOUND', 'Formulário não encontrado.');
    },
  };
}
