// Registros e anexos dos dados dos testes (`tests/support/data/`) no formato
// da API (`follow-ups-listar.md`, `follow-ups-consultar.md` e
// `follow-up-attachments-listar.md`), para os testes das telas que leem
// registros. Nenhuma regra do backend é aplicada, nem a do familiar, que não
// recebe o anulado: o teste diz a lista que a API devolveria.
import { attachmentsAsOf } from '../data/attachments.js';
import { followUpsAsOf } from '../data/followUps.js';
import { apiFailure, apiPage } from '../apiStub.js';

// Ordem da API: visita mais recente primeiro, depois o envio mais recente.
const byVisit = (a, b) =>
  b.visitedAt.localeCompare(a.visitedAt) ||
  b.submittedAt.localeCompare(a.submittedAt);

/** Registros de um paciente nos dados dos testes, na ordem da API. */
export function patientFollowUps(patientId, now = new Date()) {
  return followUpsAsOf(now)
    .filter((followUp) => followUp.patientId === patientId)
    .sort(byVisit);
}

/**
 * Rotas de registros e anexos: a lista responde `list` ou, sem ela, os
 * registros do paciente pedido; o detalhe, o registro de `list` e, fora
 * dela, o dos dados dos testes; os anexos, os do registro nos dados dos
 * testes. Os instantes são calculados na hora da chamada, como nos dados.
 */
export function followUpRoutes(list = null) {
  return {
    'GET /follow-ups': ({ query }) =>
      apiPage(list ?? patientFollowUps(query.patientId), {
        limit: Number(query.limit ?? 20),
      }),
    'GET /follow-ups/:followUpId': ({ params }) => {
      const followUp = [...(list ?? []), ...followUpsAsOf(new Date())].find(
        (item) => item.id === params.followUpId,
      );
      return followUp
        ? { data: followUp, meta: {} }
        : apiFailure(
            404,
            'FOLLOW_UP_NOT_FOUND',
            'Registro de acompanhamento não encontrado.',
          );
    },
    'GET /follow-ups/:followUpId/attachments': ({ params }) =>
      apiPage(
        attachmentsAsOf(new Date()).filter(
          (attachment) => attachment.followUpId === params.followUpId,
        ),
      ),
  };
}
