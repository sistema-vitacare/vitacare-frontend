// Alertas e notificações no formato da API (`alerts-consultar.md`,
// `alerts-resumo.md` e `notifications-listar.md`), para os testes das telas
// de alertas, do detalhe do registro e do sino. Nenhuma regra do backend é
// aplicada: a API filtra, ordena, conta e resolve; o teste diz o que ela
// devolveria.
import { apiFailure, apiPage } from '../apiStub.js';

export const DIRCE = {
  id: '0b639b83-76d0-570a-9017-7b6263d892cf',
  name: 'Dirce Albuquerque Moraes',
  mainCondition: 'Hipertensão arterial',
};
export const OSVALDO = {
  id: '91fb0349-7fb0-5be9-ac72-eb28afa2b17e',
  name: 'Osvaldo Teixeira Lins',
  mainCondition: 'Diabetes tipo 2',
};

export const READING = 'a1e70000-0000-5000-8001-000000000001';
export const ABSENCE = 'a1e70000-0000-5000-8001-000000000002';
export const REMINDER = 'a1e70000-0000-5000-8001-000000000003';
export const RESOLVED = 'a1e70000-0000-5000-8001-000000000004';
export const FOLLOW_UP = 'f0110000-0000-5000-8000-000100000013';

const CARLA = { id: 'u-carla', name: 'Carla Mendes' };

/** Um alerta como a API devolve, com as mudanças do teste. */
export function apiAlert(id, patient, changes = {}) {
  return {
    id,
    patient,
    source: 'reading',
    severity: 'warning',
    status: 'open',
    title: 'Alerta',
    message: 'Mensagem do alerta.',
    rule: null,
    followUp: null,
    field: null,
    value: null,
    operator: null,
    referenceValue: null,
    absence: null,
    medicationReminder: null,
    generatedAt: '2026-11-25T11:02:00.000Z',
    resolution: null,
    notification: null,
    ...changes,
  };
}

/** Um alerta de cada origem e um resolvido; lista nova a cada chamada. */
export function allAlerts() {
  return [
    apiAlert(READING, DIRCE, {
      severity: 'critical',
      title: 'Pressão sistólica acima de 160',
      message: 'Pressão sistólica: 182 mmHg (maior que 160 mmHg).',
      rule: {
        id: 'eaff9c46-5810-5c0e-873c-734168440650',
        name: 'Pressão sistólica acima de 160',
      },
      followUp: {
        id: FOLLOW_UP,
        visitedAt: '2026-11-25T11:00:00.000Z',
        status: 'valid',
        author: CARLA,
      },
      field: {
        key: '130f1e42-d2f0-501c-bdbc-26e7b89fefe8',
        name: 'Pressão sistólica',
        unit: 'mmHg',
      },
      value: '182',
      operator: 'gt',
      referenceValue: 160,
      generatedAt: '2026-11-25T11:02:00.000Z',
    }),
    apiAlert(ABSENCE, OSVALDO, {
      source: 'absence',
      title: 'Ausência de registro',
      message:
        'Sem registro de Sinais vitais desde 16/11/2026 08:00; esperado a cada 1 semana.',
      absence: {
        form: {
          id: '8c0342e9-d9e9-58c2-a229-1c32168a8bf2',
          name: 'Sinais vitais',
        },
        since: '2026-11-16T11:00:00.000Z',
        dueAt: '2026-11-23T11:00:00.000Z',
        frequency: { interval: 1, unit: 'weeks' },
      },
      generatedAt: '2026-11-24T11:05:00.000Z',
    }),
    apiAlert(REMINDER, OSVALDO, {
      source: 'medication_reminder',
      severity: 'info',
      title: 'Lembrete de medicamento',
      message: 'Metformina 850 mg: 1 comprimido às 08:00.',
      medicationReminder: {
        medication: {
          id: 'a7e40000-0000-5000-8000-000000000009',
          name: 'Metformina 850 mg',
        },
        reminderId: 'a7e50000-0000-5000-8000-000000000001',
        scheduledAt: '2026-11-24T11:00:00.000Z',
      },
      generatedAt: '2026-11-24T10:00:00.000Z',
    }),
    apiAlert(RESOLVED, DIRCE, {
      severity: 'critical',
      status: 'resolved',
      title: 'Pressão sistólica acima de 160',
      message: 'Pressão sistólica: 171 mmHg (maior que 160 mmHg).',
      generatedAt: '2026-11-20T11:02:00.000Z',
      resolution: {
        resolvedAt: '2026-11-20T12:00:00.000Z',
        resolvedBy: { id: 'u-rafael', name: 'Rafael Moura Brandão' },
      },
    }),
  ];
}

/** O resumo dos abertos de `list`, como `GET /alerts/summary`. */
export function summaryOf(list) {
  const open = list.filter((alert) => alert.status === 'open');
  const count = (severity) =>
    open.filter((alert) => alert.severity === severity).length;
  return {
    data: {
      open: {
        total: open.length,
        critical: count('critical'),
        warning: count('warning'),
        info: count('info'),
      },
    },
    meta: {},
  };
}

/**
 * Lista, resumo e detalhe dos alertas de `list`. A lista e o resumo
 * respondem pelos filtros de paciente, situação e severidade, sem ordenar;
 * a lista é lida a cada requisição, então o teste que a altera vê a tela
 * recarregar.
 */
export function alertRoutes(list = allAlerts()) {
  const matching = (query) =>
    list.filter(
      (alert) =>
        (!query.patientId || alert.patient.id === query.patientId) &&
        (!query.status || alert.status === query.status) &&
        (!query.severity || alert.severity === query.severity) &&
        (!query.source || alert.source === query.source),
    );
  return {
    'GET /alerts': ({ query }) =>
      apiPage(matching(query), { limit: Number(query.limit ?? 20) }),
    'GET /alerts/summary': ({ query }) => summaryOf(matching(query)),
    'GET /alerts/:alertId': ({ params }) => {
      const alert = list.find((item) => item.id === params.alertId);
      return alert
        ? { data: alert, meta: {} }
        : apiFailure(404, 'ALERT_NOT_FOUND', 'Alerta não encontrado.');
    },
  };
}

/** Uma notificação da caixa, como `GET /notifications`. */
export function apiNotification(id, alert, changes = {}) {
  return {
    id,
    alert: {
      id: alert.id,
      patient: { id: alert.patient.id, name: alert.patient.name },
      source: alert.source,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      message: alert.message,
      generatedAt: alert.generatedAt,
    },
    reason: 'patient_link',
    readAt: null,
    createdAt: alert.generatedAt,
    ...changes,
  };
}
