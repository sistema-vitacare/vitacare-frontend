// Anexos dos registros pelas rotas `follow-ups/{followUpId}/attachments` da
// API (manual `follow-up-attachments-*.md`, conferido em 24/11/2026 no
// commit `3beebe3` do backend). A API reconhece o tipo pelo conteúdo e
// confere o tamanho, o limite e a autoria.
import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPath,
  apiUpload,
} from './apiClient.js';

export function listAttachments(followUpId) {
  return apiGet(apiPath`/follow-ups/${followUpId}/attachments`);
}

export function uploadAttachment(followUpId, file) {
  return apiUpload(apiPath`/follow-ups/${followUpId}/attachments`, file);
}

export function removeAttachment(followUpId, attachmentId) {
  return apiDelete(
    apiPath`/follow-ups/${followUpId}/attachments/${attachmentId}`,
  );
}

/** `{ blob, fileName }`, com o nome que a API manda. */
export function downloadAttachment(followUpId, attachmentId) {
  return apiDownload(
    apiPath`/follow-ups/${followUpId}/attachments/${attachmentId}/content`,
  );
}
