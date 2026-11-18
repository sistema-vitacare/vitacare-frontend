// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { placeholderPdf } from '../../src/utils/placeholderPdf.js';

const latin1 = (bytes) => String.fromCharCode(...bytes);

describe('placeholderPdf', () => {
  it('devolve bytes, que o Blob do download recebe direto', () => {
    expect(placeholderPdf(['Relatório'])).toBeInstanceOf(Uint8Array);
  });

  it('gera um PDF de uma página, do cabeçalho ao fim do arquivo', () => {
    const text = latin1(placeholderPdf(['Relatório do paciente']));

    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Type /Page ');
  });

  it('aponta na tabela xref a posição exata de cada objeto', () => {
    const text = latin1(placeholderPdf(['Linha um', 'Linha dois']));
    const start = Number(text.match(/startxref\n(\d+)/)[1]);
    const offsets = [
      ...text.slice(start).matchAll(/^(\d{10}) 00000 n $/gm),
    ].map((match) => Number(match[1]));

    expect(text.slice(start, start + 4)).toBe('xref');
    expect(offsets).toHaveLength(5);
    offsets.forEach((offset, index) => {
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(true);
    });
  });

  it('escreve os acentos em WinAnsi e protege parênteses do texto', () => {
    const text = latin1(placeholderPdf(['Relatório (simulação)']));

    expect(text).toContain('(Relat\\363rio \\(simula\\347\\343o\\)) Tj');
  });
});
