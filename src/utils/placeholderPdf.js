// PDF de uma página com linhas de texto fixas. O relatório simulado usa este
// arquivo no lugar do PDF da API, para que a tela já baixe o arquivo pelo
// mesmo caminho da integração; o conteúdo real é gerado pela API.

const FONT_SIZE = 12;
const LINE_HEIGHT = 18;
const TOP = 790;
const LEFT = 56;

// Helvetica com WinAnsiEncoding: os acentos do português ficam entre 0xA0 e
// 0xFF, iguais ao Latin-1, e vão como escape octal.
function pdfString(text) {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (char === '(' || char === ')' || char === '\\') {
        return `\\${char}`;
      }
      if (code >= 0xa0 && code <= 0xff) {
        return `\\${code.toString(8)}`;
      }
      return code < 0x80 ? char : '?';
    })
    .join('');
}

/** Bytes do PDF com uma linha de texto por item de `lines`. */
export function placeholderPdf(lines) {
  const content = lines
    .map(
      (line, index) =>
        `BT /F1 ${FONT_SIZE} Tf ${LEFT} ${TOP - index * LINE_HEIGHT} Td (${pdfString(line)}) Tj ET`,
    )
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Todo caractere do arquivo já é ASCII, então cada um vira um byte.
  return Uint8Array.from(body, (char) => char.charCodeAt(0));
}
