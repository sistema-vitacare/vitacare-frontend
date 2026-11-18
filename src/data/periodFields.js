// Campos de início e fim de um período, com as mensagens dos códigos que a
// API devolve para eles.
export const periodFieldsContent = {
  from: 'De',
  to: 'Até',
  errors: {
    IS_CALENDAR_DATE:
      'Informe uma data válida; o fim não pode ser anterior ao início.',
    AFTER_END: 'Sem data final, o início não pode ser depois de hoje.',
    PERIOD_TOO_LONG: 'O período pode ter no máximo 366 dias.',
  },
};
