// Anexos dos registros de acompanhamento, simulados em memória no formato
// das rotas `follow-ups/{followUpId}/attachments` da API (manual
// `follow-up-attachments-*.md`, conferido em 11/11/2026 no commit `dc0af9c`
// do backend). O download do arquivo fica para a integração.
import { PERMISSIONS as P } from '../constants/permissions.js';
import { attachmentsAsOf } from '../data/mocks/attachments.js';
import {
  ATTACHMENT_LIMIT,
  ATTACHMENT_MAX_BYTES,
  detectContentType,
  sanitizeFileName,
} from '../utils/attachments.js';
import { currentViewer } from './authService.js';
import {
  followUpNotFound,
  reachableFollowUp,
  requireAnyPermission,
} from './followUpService.js';
import { findFollowUp } from './followUpStore.js';
import {
  ApiError,
  mockRequest,
  registerMockState,
  requirePermission,
  respond,
} from './mockApi.js';
import { canReach, findPatient, nextId } from './patientStore.js';

let uploaded = [];
let removedIds = new Set();

registerMockState(() => {
  uploaded = [];
  removedIds = new Set();
});

function activeAttachments(now) {
  return [...attachmentsAsOf(now), ...uploaded]
    .filter((attachment) => !removedIds.has(attachment.id))
    .sort(
      (a, b) =>
        a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id),
    );
}

const attachmentError = (status, code, message) =>
  new ApiError({ status, code, message });

const notAuthor = () =>
  attachmentError(
    403,
    'ATTACHMENT_NOT_AUTHOR',
    'Só quem fez o registro pode anexar ou remover arquivos dele.',
  );

// O tipo vem da assinatura dos primeiros bytes, e não do nome nem do tipo
// informado pelo navegador, como na API.
async function readHead(file) {
  const head = file.slice(0, 16);
  if (typeof head.arrayBuffer === 'function') {
    return new Uint8Array(await head.arrayBuffer());
  }
  return new Uint8Array(
    await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(head);
    }),
  );
}

/** Anexos ativos do registro, na ordem de envio. */
export function listAttachments(followUpId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requirePermission(viewer, P.PATIENT_HISTORY_READ);
    reachableFollowUp(viewer, followUpId);
    return respond(
      activeAttachments(new Date()).filter(
        (attachment) => attachment.followUpId === followUpId,
      ),
    );
  });
}

/**
 * Anexa um arquivo ao registro, na ordem de conferência da API: permissão,
 * tamanho, conteúdo e, por fim, o registro (alcance, autoria, anulação,
 * paciente ativo e limite de 5).
 */
export function uploadAttachment(followUpId, file) {
  return mockRequest(async () => {
    const viewer = currentViewer();
    requirePermission(viewer, P.FOLLOW_UPS_CREATE);
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw attachmentError(
        413,
        'ATTACHMENT_TOO_LARGE',
        'O arquivo passa de 10 MB.',
      );
    }
    if (file.size === 0) {
      throw attachmentError(422, 'ATTACHMENT_EMPTY', 'O arquivo está vazio.');
    }
    const contentType = detectContentType(await readHead(file));
    if (!contentType) {
      throw attachmentError(
        415,
        'ATTACHMENT_UNSUPPORTED_TYPE',
        'Envie uma imagem JPEG, PNG ou WEBP, ou um PDF.',
      );
    }
    const now = new Date();
    const followUp = findFollowUp(followUpId, now);
    if (!followUp || !canReach(viewer, followUp.patientId)) {
      throw followUpNotFound();
    }
    if (followUp.author.id !== viewer.user.id) {
      throw notAuthor();
    }
    if (followUp.status !== 'valid') {
      throw attachmentError(
        409,
        'ATTACHMENT_FOLLOW_UP_ANNULLED',
        'Registro anulado não recebe anexo.',
      );
    }
    if (findPatient(followUp.patientId)?.status !== 'active') {
      throw attachmentError(
        409,
        'ATTACHMENT_PATIENT_INACTIVE',
        'Paciente inativo não recebe anexo.',
      );
    }
    const count = activeAttachments(now).filter(
      (attachment) => attachment.followUpId === followUpId,
    ).length;
    if (count >= ATTACHMENT_LIMIT) {
      throw attachmentError(
        409,
        'ATTACHMENT_LIMIT_REACHED',
        'O registro já tem 5 anexos.',
      );
    }
    const attachment = {
      id: nextId('a11a0000'),
      followUpId,
      fileName: sanitizeFileName(file.name, contentType),
      contentType,
      sizeBytes: file.size,
      uploadedBy: { id: viewer.user.id, name: viewer.user.name },
      uploadedAt: now.toISOString(),
    };
    uploaded = [...uploaded, attachment];
    return respond(attachment);
  });
}

/**
 * Remove o anexo, de forma definitiva. Profissional e administrador removem
 * qualquer um; a cuidadora, só os que ela enviou. A API responde `204`, sem
 * corpo.
 */
export function removeAttachment(followUpId, attachmentId) {
  return mockRequest(() => {
    const viewer = currentViewer();
    requireAnyPermission(viewer, [P.FOLLOW_UPS_ANNUL, P.FOLLOW_UPS_CREATE]);
    const now = new Date();
    const attachment = activeAttachments(now).find(
      (item) => item.id === attachmentId && item.followUpId === followUpId,
    );
    const notFound = attachmentError(
      404,
      'ATTACHMENT_NOT_FOUND',
      'Anexo não encontrado.',
    );
    if (!attachment) {
      throw notFound;
    }
    if (!viewer.permissions.includes(P.FOLLOW_UPS_ANNUL)) {
      const followUp = findFollowUp(followUpId, now);
      if (!canReach(viewer, followUp.patientId)) {
        throw notFound;
      }
      if (attachment.uploadedBy.id !== viewer.user.id) {
        throw notAuthor();
      }
    }
    removedIds = new Set([...removedIds, attachmentId]);
    return respond(null);
  });
}
