// Textos do cartão de uma série de evolução, usado no histórico do paciente
// e no relatório.
const samples = (count) => `${count} ${count === 1 ? 'medição' : 'medições'}`;

export const evolutionSeriesContent = {
  mean: 'Média',
  variation: 'Variação',
  trend: 'Tendência',
  directions: {
    rising: (slope) => `Sobe ${slope} por dia`,
    falling: (slope) => `Cai ${slope} por dia`,
    flat: () => 'Estável',
  },
  // Motivos de `indicators.unavailable` da API (UC10, fluxo alternativo).
  unavailable: ({ reason, minimumSamples }) =>
    reason === 'INSUFFICIENT_TIME_SPAN'
      ? 'Não calculada: todas as medições no mesmo instante.'
      : `Não calculada: são necessárias ao menos ${samples(minimumSamples)}.`,
  chartLabel: (name) => `Gráfico da evolução de ${name}`,
};
