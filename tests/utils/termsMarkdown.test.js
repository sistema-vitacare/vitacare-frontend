import { describe, expect, it } from 'vitest';
import { parseTerms } from '../../src/utils/termsMarkdown.js';

describe('leitor do termo de uso', () => {
  it('separa títulos de primeiro e segundo nível', () => {
    expect(parseTerms('# Termo\n\n## 1. O que é')).toEqual([
      { type: 'heading', level: 1, content: [{ text: 'Termo', bold: false }] },
      {
        type: 'heading',
        level: 2,
        content: [{ text: '1. O que é', bold: false }],
      },
    ]);
  });

  it('junta as linhas de um parágrafo e separa parágrafos pela linha em branco', () => {
    expect(parseTerms('Primeira linha\nsegunda linha.\n\nOutro.')).toEqual([
      {
        type: 'paragraph',
        content: [{ text: 'Primeira linha segunda linha.', bold: false }],
      },
      { type: 'paragraph', content: [{ text: 'Outro.', bold: false }] },
    ]);
  });

  it('marca o negrito dentro do texto', () => {
    expect(parseTerms('Ele é **titular** dos dados.')).toEqual([
      {
        type: 'paragraph',
        content: [
          { text: 'Ele é ', bold: false },
          { text: 'titular', bold: true },
          { text: ' dos dados.', bold: false },
        ],
      },
    ]);
  });

  it('deixa o asterisco sem par como texto', () => {
    expect(parseTerms('Nota **sem fim')).toEqual([
      { type: 'paragraph', content: [{ text: 'Nota **sem fim', bold: false }] },
    ]);
  });

  it('agrupa os itens seguidos de lista com marcador e de lista numerada', () => {
    expect(
      parseTerms(
        '- **Não** faz diagnóstico.\n- Não é prontuário.\n\n1. acesso;\n2. correção.',
      ),
    ).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [
            { text: 'Não', bold: true },
            { text: ' faz diagnóstico.', bold: false },
          ],
          [{ text: 'Não é prontuário.', bold: false }],
        ],
      },
      {
        type: 'list',
        ordered: true,
        items: [
          [{ text: 'acesso;', bold: false }],
          [{ text: 'correção.', bold: false }],
        ],
      },
    ]);
  });

  it('não interpreta marcação fora das cinco construções, que vira texto', () => {
    expect(parseTerms('<script>alert(1)</script> e [link](x)')).toEqual([
      {
        type: 'paragraph',
        content: [
          { text: '<script>alert(1)</script> e [link](x)', bold: false },
        ],
      },
    ]);
  });
});
