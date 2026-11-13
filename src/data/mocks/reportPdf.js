// Texto da página fixa do PDF simulado do relatório. O PDF real, com os
// gráficos, os indicadores e os registros, é gerado pela API
// (GET /patients/{patientId}/report/pdf).
export function reportPdfLines({ patientName, from, to }) {
  return [
    'VitaCare - Relatório do paciente',
    `Paciente: ${patientName}`,
    `Período: ${from} a ${to}`,
    '',
    'Arquivo de demonstração: com os dados simulados, o PDF não traz',
    'o conteúdo do relatório. Depois da integração, a API gera o arquivo',
    'com os gráficos, os indicadores e os registros do período.',
  ];
}

// Página fixa do PDF simulado dos relatórios gerenciais
// (GET /management-reports/alerts/pdf e /caregivers/pdf).
export function managementReportPdfLines({ title, from, to, condition }) {
  return [
    `VitaCare - ${title}`,
    `Período: ${from} a ${to}`,
    `Condição: ${condition ?? 'todos os pacientes'}`,
    '',
    'Arquivo de demonstração: com os dados simulados, o PDF não traz',
    'o conteúdo do relatório. Depois da integração, a API gera o arquivo',
    'com os totais, as tabelas e as listas do período.',
  ];
}
