// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_MAX_BYTES,
  attachmentFileError,
  detectContentType,
  formatFileSize,
  sanitizeFileName,
} from '../../src/utils/attachments.js';

const bytes = (...values) => Uint8Array.from(values);
const ascii = (text) => Uint8Array.from(text, (char) => char.charCodeAt(0));

describe('detectContentType', () => {
  it('reconhece JPEG, PNG, WEBP e PDF pela assinatura do conteúdo', () => {
    expect(detectContentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(
      detectContentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('image/png');
    expect(
      detectContentType(ascii('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')),
    ).toBe('image/webp');
    expect(detectContentType(ascii('%PDF-1.7'))).toBe('application/pdf');
  });

  it('não reconhece texto, nem com nome de imagem', () => {
    expect(detectContentType(ascii('olá, isto é texto'))).toBeNull();
    expect(
      detectContentType(ascii('RIFF\u0000\u0000\u0000\u0000WAVE')),
    ).toBeNull();
  });
});

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

describe('sanitizeFileName', () => {
  it('fica só com o nome final, sem caracteres de controle e com até 255 caracteres', () => {
    expect(sanitizeFileName('C:\\fotos\\curativo.jpg', 'image/jpeg')).toBe(
      'curativo.jpg',
    );
    expect(sanitizeFileName('a/b/re\u0007ceita.pdf', 'application/pdf')).toBe(
      'receita.pdf',
    );
    expect(sanitizeFileName('x'.repeat(300), 'image/png')).toHaveLength(255);
  });

  it('dá nome ao arquivo sem nome, pela extensão do tipo', () => {
    expect(sanitizeFileName('', 'image/webp')).toBe('anexo.webp');
    expect(sanitizeFileName('   ', 'application/pdf')).toBe('anexo.pdf');
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
