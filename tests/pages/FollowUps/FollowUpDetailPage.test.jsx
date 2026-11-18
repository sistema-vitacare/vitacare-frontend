import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PATHS, recordPath } from '../../../src/constants/routes.js';
import { followUpDetailContent as content } from '../../../src/data/followUpPages.js';
import FollowUpDetailPage from '../../../src/pages/FollowUps/FollowUpDetailPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';

const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const ANNULLED = 'f0110000-0000-5000-8000-000100000008';
const HIGH_GLUCOSE = 'f0110000-0000-5000-8000-000300000005';
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function renderDetail(followUpId, profile = 'professional', state) {
  return renderPage(
    [
      { path: PATHS.RECORD_DETAIL, element: <FollowUpDetailPage /> },
      { path: PATHS.RECORDS, element: <p>Registros</p> },
    ],
    { profile, path: { pathname: recordPath(followUpId), state } },
  );
}

function attachmentsCard() {
  return screen
    .getByRole('heading', { name: content.attachments.title })
    .closest('.MuiCard-root');
}

afterEach(() => {
  resetMockState();
  resetViewport();
});

describe('FollowUpDetailPage', () => {
  it('mostra paciente, formulário e versão, visita, autor, respostas por seção e situação', async () => {
    renderDetail(LAST_VITAL_SIGNS);

    expect(
      await screen.findByRole('link', { name: 'Dirce Albuquerque Moraes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sinais vitais (versão 1)')).toBeInTheDocument();
    expect(screen.getByText('Rosângela Prado')).toBeInTheDocument();
    expect(screen.getByText('Válido')).toBeInTheDocument();
    expect(screen.getByText('126 mmHg')).toBeInTheDocument();
    expect(screen.getByText('36,5 °C')).toBeInTheDocument();
    expect(
      screen.getByText('Pressão estável. Tomou os medicamentos no horário.'),
    ).toBeInTheDocument();
  });

  it('avisa que o registro foi salvo quando vem do registro de visita', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'caregiver', { created: true });

    expect(await screen.findByText(content.created)).toBeInTheDocument();
  });

  it('mostra o anulado com quem anulou, quando e o motivo', async () => {
    renderDetail(ANNULLED);

    expect(
      await screen.findByText(/Anulado por Rafael Moura Brandão/),
    ).toHaveTextContent('manguito de tamanho errado');
    expect(
      screen.queryByRole('button', { name: content.annul.action }),
    ).toBeNull();
  });

  it('mostra os alertas que o registro gerou', async () => {
    renderDetail(HIGH_GLUCOSE, 'caregiver');

    expect(
      await screen.findByText('Glicemia acima de 180'),
    ).toBeInTheDocument();
    expect(screen.getByText('Glicemia acima de 250')).toBeInTheDocument();
  });

  it('anula com motivo obrigatório e passa a mostrar o registro anulado', async () => {
    renderDetail(LAST_VITAL_SIGNS);

    fireEvent.click(
      await screen.findByRole('button', { name: content.annul.action }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: content.annul.title,
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: content.annul.confirm }),
    );
    expect(
      within(dialog).getByText(content.annul.required),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Motivo/ }), {
      target: { value: 'Paciente errado.' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: content.annul.confirm }),
    );

    expect(await screen.findByText(content.annul.done)).toBeInTheDocument();
    expect(screen.getByText(/Motivo: Paciente errado\./)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: content.annul.action }),
    ).toBeNull();
  });

  it('deixa a cuidadora autora anexar e remover o anexo que enviou', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'caregiver');
    expect(await screen.findByText('receita-medica.pdf')).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText(content.attachments.add, { selector: 'input' }),
      {
        target: {
          files: [new File([JPEG], 'curativo.jpg', { type: 'image/jpeg' })],
        },
      },
    );
    expect(
      await screen.findByText(content.attachments.uploaded),
    ).toBeInTheDocument();
    expect(await screen.findByText('curativo.jpg')).toBeInTheDocument();

    fireEvent.click(
      within(attachmentsCard()).getByRole('button', {
        name: content.attachments.remove('receita-medica.pdf'),
      }),
    );
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: content.attachments.removeDialog.confirm,
      }),
    );
    expect(
      await screen.findByText(content.attachments.removed),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('receita-medica.pdf')).toBeNull(),
    );
  });

  it('recusa antes do envio o arquivo de tipo não aceito', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'caregiver');
    await screen.findByText('receita-medica.pdf');

    fireEvent.change(
      screen.getByLabelText(content.attachments.add, { selector: 'input' }),
      {
        target: {
          files: [new File(['a;b'], 'planilha.csv', { type: 'text/csv' })],
        },
      },
    );

    expect(
      await screen.findByText(content.attachments.errors.UNSUPPORTED_TYPE),
    ).toBeInTheDocument();
  });

  it('deixa o profissional remover, mas não anexar', async () => {
    renderDetail(LAST_VITAL_SIGNS);
    await screen.findByText('receita-medica.pdf');

    expect(
      within(attachmentsCard()).queryByRole('button', {
        name: content.attachments.add,
      }),
    ).toBeNull();
    expect(
      within(attachmentsCard()).getByRole('button', {
        name: content.attachments.remove('receita-medica.pdf'),
      }),
    ).toBeInTheDocument();
  });

  it('deixa a familiar só ler, sem anular, anexar nem remover', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'family');
    await screen.findByText('receita-medica.pdf');

    expect(
      screen.queryByRole('button', { name: content.annul.action }),
    ).toBeNull();
    expect(within(attachmentsCard()).queryAllByRole('button')).toEqual([]);
  });

  it('diz à familiar que o registro anulado não foi encontrado', async () => {
    renderDetail(ANNULLED, 'family');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });
});
