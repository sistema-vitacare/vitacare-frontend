// Anexos simulados dos registros de acompanhamento, com os campos de
// GET /follow-ups/{followUpId}/attachments. Como os registros, acompanham o
// dia de hoje: cada anexo é enviado alguns minutos depois do registro.
import { followUpsAsOf } from './followUps.js';

const seeds = [
  {
    id: 'a7706adb-9b79-5499-a6f3-bdce777c77a6',
    // Última visita de sinais vitais de Dirce, feita por Rosângela.
    followUpId: 'f0110000-0000-5000-8000-000100000013',
    fileName: 'receita-medica.pdf',
    contentType: 'application/pdf',
    sizeBytes: 182344,
    minutesAfterSubmit: 4,
  },
];

/** Anexos com o envio calculado a partir de `now`. */
export function attachmentsAsOf(now) {
  const followUps = new Map(
    followUpsAsOf(now).map((followUp) => [followUp.id, followUp]),
  );
  return seeds.map(({ minutesAfterSubmit, ...attachment }) => {
    const followUp = followUps.get(attachment.followUpId);
    return {
      ...attachment,
      uploadedBy: followUp.author,
      uploadedAt: new Date(
        Date.parse(followUp.submittedAt) + minutesAfterSubmit * 60 * 1000,
      ).toISOString(),
    };
  });
}
