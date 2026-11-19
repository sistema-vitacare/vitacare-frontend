// O termo de uso chega da API em Markdown com só cinco construções
// (`terms-vigente.md`): `#`, `##`, parágrafo, lista com `-` ou `1.` e
// negrito com `**`. O leitor devolve blocos que a tela monta com React; nada
// do texto vira HTML, e o que não for uma dessas construções fica como texto.

const HEADING = /^(#{1,2}) (.+)$/;
const BULLET = /^- (.+)$/;
const NUMBERED = /^\d+\. (.+)$/;

/** Trechos do texto, com o negrito marcado; `**` sem par fica como texto. */
function inline(text) {
  const parts = text.split('**');
  if (parts.length % 2 === 0) {
    return [{ text, bold: false }];
  }
  return parts
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((part) => part.text !== '');
}

export function parseTerms(markdown) {
  const blocks = [];
  let paragraph = [];

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: inline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  const addItem = (ordered, text) => {
    closeParagraph();
    const last = blocks.at(-1);
    if (last?.type === 'list' && last.ordered === ordered) {
      last.items.push(inline(text));
    } else {
      blocks.push({ type: 'list', ordered, items: [inline(text)] });
    }
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (line === '') {
      closeParagraph();
    } else if (heading) {
      closeParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        content: inline(heading[2]),
      });
    } else if (bullet) {
      addItem(false, bullet[1]);
    } else if (numbered) {
      addItem(true, numbered[1]);
    } else {
      paragraph.push(line);
    }
  }
  closeParagraph();
  return blocks;
}
