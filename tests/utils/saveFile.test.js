import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveFile } from '../../src/utils/saveFile.js';

afterEach(() => {
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

describe('saveFile', () => {
  it('baixa o arquivo com o nome dado e libera o endereço temporário', () => {
    URL.createObjectURL = vi.fn(() => 'blob:relatorio');
    URL.revokeObjectURL = vi.fn();
    const clicks = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function record() {
        clicks.push({ href: this.href, download: this.download });
      });
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });

    saveFile(blob, 'relatorio-paciente-2026-10-12-a-2026-11-10.pdf');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicks).toEqual([
      {
        href: 'blob:relatorio',
        download: 'relatorio-paciente-2026-10-12-a-2026-11-10.pdf',
      },
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
    click.mockRestore();
  });

  it('não deixa o link do download no documento', () => {
    URL.createObjectURL = vi.fn(() => 'blob:relatorio');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    saveFile(new Blob(['a;b']), 'auditoria.csv');

    expect(document.querySelector('a[download]')).toBeNull();
    click.mockRestore();
  });
});
