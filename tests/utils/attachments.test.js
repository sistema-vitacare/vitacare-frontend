// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_MAX_BYTES,
  attachmentFileError,
  formatFileSize,
} from '../../src/utils/attachments.js';

describe('attachmentFileError', () => {
  it('recusa antes do envio o arquivo vazio, acima de 10 MiB ou fora dos quatro tipos', () => {
    expect(
      attachmentFileError({ name: 'foto.jpg', type: 'image/jpeg', size: 0 }),
    ).toBe('EMPTY');
    expect(
      attachmentFileError({
        name: 'exame.pdf',
        type: 'application/pdf',
        size: ATTACHMENT_MAX_BYTES + 1,
      }),
    ).toBe('TOO_LARGE');
    expect(
      attachmentFileError({ name: 'planilha.xlsx', type: '', size: 10 }),
    ).toBe('UNSUPPORTED_TYPE');
    expect(
      attachmentFileError({ name: 'video.mp4', type: 'video/mp4', size: 10 }),
    ).toBe('UNSUPPORTED_TYPE');
  });

  it('aceita os quatro tipos até 10 MiB, pelo tipo ou pela extensão', () => {
    const accepted = [
      { name: 'curativo.JPG', type: '', size: ATTACHMENT_MAX_BYTES },
      { name: 'receita', type: 'application/pdf', size: 1 },
      { name: 'pele.png', type: 'image/png', size: 2048 },
      { name: 'ferida.webp', type: 'image/webp', size: 2048 },
    ];

    expect(accepted.map(attachmentFileError)).toEqual([null, null, null, null]);
  });
});

describe('formatFileSize', () => {
  it('mostra bytes, KB e MB no formato brasileiro', () => {
    expect(formatFileSize(512)).toBe('512 bytes');
    expect(formatFileSize(182344)).toBe('178 KB');
    expect(formatFileSize(ATTACHMENT_MAX_BYTES)).toBe('10 MB');
    expect(formatFileSize(1572864)).toBe('1,5 MB');
  });
});
