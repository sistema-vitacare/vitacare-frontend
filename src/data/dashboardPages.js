// Textos do painel operacional (Figura 33) e do detalhe de cada indicador.
const count = (total, singular, plural) =>
  `${total} ${total === 1 ? singular : plural}`;

const periodNames = {
  today: 'Hoje',
  7: 'Últimos 7 dias',
  30: 'Últimos 30 dias',
  90: 'Últimos 90 dias',
};

function changeText(change, period) {
  if (change === 0) {
    return 'Igual ao período anterior';
  }
  const sign = change > 0 ? '+' : '−';
  const before = period === 'today' ? 'a ontem' : 'ao período anterior';
  return `${sign}${Math.abs(change)} em relação ${before}`;
}

export const dashboardContent = {
  title: 'Painel',
  period: (shortcut, from, to) =>
    from === to
      ? `${periodNames[shortcut]} · ${from}`
      : `${periodNames[shortcut]} · ${from} a ${to}`,
  shortcutsLabel: 'Período',
  shortcuts: { today: 'Hoje', 7: '7 dias', 30: '30 dias', 90: '90 dias' },
  indicatorsLabel: 'Indicadores',
  indicators: {
    patients: {
      label: 'Pacientes ativos',
      detail: ({ patients }) =>
        `${count(patients.newInPeriod, 'cadastrado', 'cadastrados')} no período`,
    },
    alerts: {
      label: 'Alertas pendentes',
      detail: ({ alerts }) =>
        `${count(alerts.issuedInPeriod, 'emitido', 'emitidos')} no período`,
    },
    followUps: {
      label: 'Registros no período',
      detail: ({ followUps }, shortcut) =>
        changeText(followUps.change, shortcut),
    },
    users: {
      label: 'Usuários ativos',
      detail: () => 'Já fizeram o primeiro acesso',
    },
  },
  indicatorValue: ({ patients, alerts, followUps, users }) => ({
    patients: patients.active,
    alerts: alerts.pending,
    followUps: followUps.inPeriod,
    users: users.active,
  }),
  chart: {
    title: 'Registros de acompanhamento por período',
    label: 'Registros de acompanhamento por dia',
    series: 'Registros',
  },
  priority: {
    title: 'Alertas prioritários',
    empty: 'Nenhum alerta aberto.',
    reading: (reading, operator) =>
      `${reading.fieldName}: ${reading.value}${reading.fieldUnit ? ` ${reading.fieldUnit}` : ''} (referência: ${operator} ${reading.referenceValue})`,
    author: (name) => `Registrado por ${name}`,
  },
  latest: {
    title: 'Últimos registros',
    empty: 'Nenhum registro no período.',
    detail: (form, author) => `${form} · ${author}`,
  },
  plan: {
    action: 'Ver plano',
  },
  errorText: 'Não foi possível carregar o painel.',
};

export const dashboardIndicatorContent = {
  notFound: 'Indicador não encontrado.',
  backToDashboard: 'Voltar ao painel',
  shortcutsLabel: 'Período',
  total: 'Total',
  titles: {
    patients: 'Pacientes',
    users: 'Usuários',
    followUps: 'Registros de acompanhamento',
    alerts: 'Alertas',
  },
  patients: {
    summary: ({ active, inactive, newInPeriod }) => [
      ['Ativos', active],
      ['Inativos', inactive],
      ['Cadastrados no período', newInPeriod],
    ],
    byResponsible: 'Pacientes ativos por profissional responsável',
    responsible: 'Profissional responsável',
    active: 'Ativos',
    areaLink: 'Ver pacientes',
  },
  users: {
    summary: ({ active, pending, inactive }) => [
      ['Ativos', active],
      ['Convidados', pending],
      ['Inativos', inactive],
    ],
    byProfile: 'Usuários por perfil',
    profile: 'Perfil',
    columns: ['Ativos', 'Convidados', 'Inativos'],
    areaLink: 'Ver usuários',
  },
  followUps: {
    summary: ({ inPeriod, previousPeriodTotal }) => [
      ['No período', inPeriod],
      ['No período anterior', previousPeriodTotal],
    ],
    chartLabel: 'Registros por dia',
    byForm: 'Registros por formulário',
    form: 'Formulário',
    byAuthor: 'Registros por autor',
    author: 'Autor',
    areaLink: 'Ver registros',
  },
  alerts: {
    summary: ({ issuedInPeriod, previousPeriodTotal, issuedStillOpen }) => [
      ['Emitidos no período', issuedInPeriod],
      ['No período anterior', previousPeriodTotal],
      ['Emitidos ainda abertos', issuedStillOpen],
    ],
    bySeverity: 'Alertas emitidos por severidade',
    severity: 'Severidade',
    bySource: 'Alertas emitidos por origem',
    source: 'Origem',
    pending: 'Alertas pendentes por severidade',
    areaLink: 'Ver alertas',
  },
};
