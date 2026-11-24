// Regras dos anexos de um registro, as mesmas da API (manual
// `follow-up-attachments-enviar.md`): JPEG, PNG, WEBP ou PDF, até 10 MiB e
// no máximo 5 por registro. A API reconhece o tipo pelo conteúdo; a tela
// confere antes do envio pelo tipo e pela extensão, que é o que ela tem sem
// ler o arquivo.

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_LIMIT = 5;

const TYPES = [
  { contentType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  { contentType: 'image/png', extensions: ['png'] },
  { contentType: 'image/webp', extensions: ['webp'] },
  { contentType: 'application/pdf', extensions: ['pdf'] },
];

/** Valor do `accept` do campo de arquivo: tipos e extensões aceitos. */
export const ATTACHMENT_ACCEPT = TYPES.flatMap((type) => [
  type.contentType,
  ...type.extensions.map((extension) => `.${extension}`),
]).join(',');

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
