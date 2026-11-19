// Mensagens dos erros que nascem no navegador, sem resposta da API: a API
// manda a própria mensagem em `error.message` nos demais casos.
export const apiErrorMessages = {
  network:
    'Não foi possível falar com o servidor. Confira a conexão e tente de novo.',
  unexpected: 'Não foi possível concluir a operação. Tente novamente.',
};
