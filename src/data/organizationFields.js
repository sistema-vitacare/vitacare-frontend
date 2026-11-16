// Textos dos campos da organização, comuns às Configurações (FE-26) e às
// telas da plataforma (FE-27): rótulos, diálogo de edição e mensagens por
// campo.

export const organizationFieldLabels = {
  code: 'Código da organização',
  tradeName: 'Nome fantasia',
  legalName: 'Razão social',
  document: 'Documento',
  phone: 'Telefone',
  email: 'E-mail',
};

export const organizationFormContent = {
  title: 'Editar organização',
  intro:
    'O código da organização, usado no login, não muda. Campo opcional apagado fica em branco.',
  documentHelper: 'CNPJ ou outro documento, com a pontuação.',
  save: 'Salvar',
  cancel: 'Cancelar',
  invalidFields: 'Confira os campos destacados.',
  unexpected: 'Não foi possível salvar agora. Tente de novo em instantes.',
};

// Mensagem por campo e pelo código que a API devolve para ele.
export const organizationFieldErrors = {
  tradeName: {
    MIN_LENGTH: 'Informe o nome fantasia.',
    MAX_LENGTH: 'Use no máximo 180 caracteres.',
    default: 'Nome fantasia inválido.',
  },
  legalName: {
    MAX_LENGTH: 'Use no máximo 180 caracteres.',
    default: 'Razão social inválida.',
  },
  document: {
    MATCHES: 'Use números, letras e a pontuação do documento.',
    MAX_LENGTH: 'Use no máximo 32 caracteres.',
    DUPLICATE: 'Já existe uma organização com este documento.',
    default: 'Documento inválido.',
  },
  phone: {
    MATCHES: 'Use números, espaços, parênteses, + e -.',
    MAX_LENGTH: 'Use no máximo 32 caracteres.',
    default: 'Telefone inválido.',
  },
  email: {
    IS_EMAIL: 'Informe um e-mail válido, como contato@organizacao.com.br.',
    MAX_LENGTH: 'Use no máximo 254 caracteres.',
    default: 'E-mail inválido.',
  },
};
