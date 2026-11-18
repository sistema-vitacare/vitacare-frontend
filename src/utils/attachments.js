// Regras dos anexos de um registro, as mesmas da API (manual
// `follow-up-attachments-enviar.md`): JPEG, PNG, WEBP ou PDF, até 10 MiB e
// no máximo 5 por registro. A API reconhece o tipo pelo conteúdo; a tela
// confere antes do envio pelo tipo e pela extensão, que é o que ela tem sem
// ler o arquivo.

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_LIMIT = 5;
const MAX_NAME_LENGTH = 255;

const TYPES = [
  { contentType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  { contentType: 'image/png', extensions: ['png'] },
  { contentType: 'image/webp', extensions: ['webp'] },
  { contentType: 'application/pdf', extensions: ['pdf'] },
];

export const ATTACHMENT_TYPES = TYPES.map((type) => type.contentType);

/** Valor do `accept` do campo de arquivo: tipos e extensões aceitos. */
export const ATTACHMENT_ACCEPT = TYPES.flatMap((type) => [
  type.contentType,
  ...type.extensions.map((extension) => `.${extension}`),
]).join(',');

const startsWith = (bytes, signature, offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text) => [...text].map((char) => char.charCodeAt(0));

/** Tipo pela assinatura dos primeiros bytes, ou `null` fora dos quatro. */
export function detectContentType(bytes) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) {
    return 'image/webp';
  }
  if (startsWith(bytes, ascii('%PDF-'))) {
    return 'application/pdf';
  }
  return null;
}

function extensionOf(name) {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
}

/** Problema do arquivo antes do envio: `EMPTY`, `TOO_LARGE`, `UNSUPPORTED_TYPE` ou `null`. */
export function attachmentFileError(file) {
  if (file.size === 0) {
    return 'EMPTY';
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return 'TOO_LARGE';
  }
  const extension = extensionOf(file.name);
  const accepted = TYPES.some(
    (type) =>
      type.contentType === file.type || type.extensions.includes(extension),
  );
  return accepted ? null : 'UNSUPPORTED_TYPE';
}

/**
 * Nome do arquivo como a API grava: só o nome final, sem diretório nem
 * caracteres de controle, até 255 caracteres; vazio vira `anexo.<ext>`.
 */
export function sanitizeFileName(name, contentType) {
  const base = name.split(/[\\/]/).at(-1) ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!clean) {
    const type = TYPES.find((item) => item.contentType === contentType);
    return `anexo.${type ? type.extensions[0] : 'bin'}`;
  }
  return clean.slice(0, MAX_NAME_LENGTH);
}

const sizeFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Tamanho legível: bytes, KB sem casas e MB com até uma casa. */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`;
}
