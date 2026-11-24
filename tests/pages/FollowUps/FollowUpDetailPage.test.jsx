import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PATHS, recordPath } from '../../../src/constants/routes.js';
import { followUpDetailContent as content } from '../../../src/data/followUpPages.js';
import FollowUpDetailPage from '../../../src/pages/FollowUps/FollowUpDetailPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { renderPage } from '../../support/renderPage.jsx';
import { resetViewport } from '../../support/viewport.js';
import { apiFailure, apiPage, apiStub, reply } from '../../support/apiStub.js';
import { followUpRoutes } from '../../support/fixtures/followUps.js';
import { patientRoutes } from '../../support/fixtures/patients.js';
import { demoUser } from '../../support/fixtures/sessions.js';

const LAST_VITAL_SIGNS = 'f0110000-0000-5000-8000-000100000013';
const ANNULLED = 'f0110000-0000-5000-8000-000100000008';
const HIGH_GLUCOSE = 'f0110000-0000-5000-8000-000300000005';
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const DETAIL = 'GET /follow-ups/:followUpId';
const ANNUL = 'POST /follow-ups/:followUpId/annul';
const ATTACHMENTS = 'GET /follow-ups/:followUpId/attachments';
const UPLOAD = 'POST /follow-ups/:followUpId/attachments';
const REMOVE = 'DELETE /follow-ups/:followUpId/attachments/:attachmentId';
const CONTENT = 'GET /follow-ups/:followUpId/attachments/:attachmentId/content';

// Rotas do registro que acompanham as ações do teste: anular devolve o
// registro anulado, e a lista de anexos guarda o que foi enviado e removido.
function recordApi() {
  const routes = followUpRoutes();
  let attachments = routes[ATTACHMENTS]({
    params: { followUpId: LAST_VITAL_SIGNS },
  }).data;
  const caregiver = demoUser('caregiver');
  return {
    ...patientRoutes(),
    ...routes,
    [ATTACHMENTS]: ({ params }) =>
      apiPage(params.followUpId === LAST_VITAL_SIGNS ? attachments : []),
    [UPLOAD]: ({ body }) => {
      const file = body.get('file');
      const created = {
        id: 'anexo-novo',
        followUpId: LAST_VITAL_SIGNS,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        uploadedBy: { id: caregiver.id, name: caregiver.name },
        uploadedAt: '2026-11-24T12:00:00.000Z',
      };
      attachments = [...attachments, created];
      return reply(201, { data: created, meta: {} });
    },
    [REMOVE]: ({ params }) => {
      attachments = attachments.filter(
        (attachment) => attachment.id !== params.attachmentId,
      );
      return reply(204, null);
    },
    [ANNUL]: ({ params, body }) => {
      const { data } = routes[DETAIL]({ params });
      return {
        data: {
          ...data,
          status: 'annulled',
          annulment: {
            reason: body.reason,
            annulledAt: '2026-11-24T12:00:00.000Z',
            annulledBy: { id: 'profissional', name: 'Rafael Moura Brandão' },
          },
        },
        meta: {},
      };
    },
  };
}

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

function chooseFile(file) {
  fireEvent.change(
    screen.getByLabelText(content.attachments.add, { selector: 'input' }),
    { target: { files: [file] } },
  );
}

afterEach(() => {
  resetMockState();
  resetViewport();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

beforeEach(() => {
  apiStub().use(recordApi());
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
    expect(apiStub().last(DETAIL).params).toEqual({
      followUpId: LAST_VITAL_SIGNS,
    });
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
    expect(apiStub().last(ANNUL)).toBeUndefined();
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
    expect(apiStub().last(ANNUL)).toMatchObject({
      params: { followUpId: LAST_VITAL_SIGNS },
      body: { reason: 'Paciente errado.' },
    });
  });

  it('deixa a cuidadora autora anexar e remover o anexo que enviou', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'caregiver');
    expect(await screen.findByText('receita-medica.pdf')).toBeInTheDocument();

    chooseFile(new File([JPEG], 'curativo.jpg', { type: 'image/jpeg' }));
    expect(
      await screen.findByText(content.attachments.uploaded),
    ).toBeInTheDocument();
    expect(await screen.findByText('curativo.jpg')).toBeInTheDocument();
    expect(apiStub().last(UPLOAD).body.get('file').name).toBe('curativo.jpg');

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
    expect(apiStub().last(REMOVE).params.followUpId).toBe(LAST_VITAL_SIGNS);
  });

  it('recusa antes do envio o arquivo de tipo não aceito', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'caregiver');
    await screen.findByText('receita-medica.pdf');

    chooseFile(new File(['a;b'], 'planilha.csv', { type: 'text/csv' }));

    expect(
      await screen.findByText(content.attachments.errors.UNSUPPORTED_TYPE),
    ).toBeInTheDocument();
    expect(apiStub().last(UPLOAD)).toBeUndefined();
  });

  it('mostra como erro do arquivo o tipo que a API recusa pelo conteúdo', async () => {
    apiStub().use({
      [UPLOAD]: () =>
        apiFailure(
          415,
          'ATTACHMENT_UNSUPPORTED_TYPE',
          'O conteúdo do arquivo não é de um tipo aceito.',
        ),
    });
    renderDetail(LAST_VITAL_SIGNS, 'caregiver');
    await screen.findByText('receita-medica.pdf');

    // A extensão e o tipo dizem JPEG; quem confere o conteúdo é a API.
    chooseFile(new File([JPEG], 'falso.jpg', { type: 'image/jpeg' }));

    expect(
      await screen.findByText(
        content.attachments.errors.ATTACHMENT_UNSUPPORTED_TYPE,
      ),
    ).toBeInTheDocument();
  });

  it('baixa o anexo com o nome que a API manda', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:anexo');
    URL.revokeObjectURL = vi.fn();
    const saved = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function save() {
        saved.push(this.download);
      },
    );
    apiStub().use({
      [CONTENT]: () =>
        new Response('%PDF', {
          headers: {
            'Content-Type': 'application/pdf',
            // Outro nome que o da lista: o arquivo sai com o da API.
            'Content-Disposition': 'attachment; filename="receita-2026.pdf"',
          },
        }),
    });
    renderDetail(LAST_VITAL_SIGNS, 'family');

    fireEvent.click(
      await screen.findByRole('button', {
        name: content.attachments.download('receita-medica.pdf'),
      }),
    );

    await waitFor(() => expect(saved).toEqual(['receita-2026.pdf']));
    expect(await URL.createObjectURL.mock.calls[0][0].text()).toBe('%PDF');
    expect(apiStub().last(CONTENT).params.followUpId).toBe(LAST_VITAL_SIGNS);
  });

  it('avisa quando o arquivo do anexo não está disponível', async () => {
    apiStub().use({
      [CONTENT]: () =>
        apiFailure(
          404,
          'ATTACHMENT_CONTENT_MISSING',
          'O arquivo do anexo não está disponível.',
        ),
    });
    renderDetail(LAST_VITAL_SIGNS);

    fireEvent.click(
      await screen.findByRole('button', {
        name: content.attachments.download('receita-medica.pdf'),
      }),
    );

    expect(
      await screen.findByText(
        content.attachments.errors.ATTACHMENT_CONTENT_MISSING,
      ),
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

  it('deixa a familiar só ler e baixar, sem anular, anexar nem remover', async () => {
    renderDetail(LAST_VITAL_SIGNS, 'family');
    await screen.findByText('receita-medica.pdf');

    expect(
      screen.queryByRole('button', { name: content.annul.action }),
    ).toBeNull();
    expect(
      within(attachmentsCard())
        .queryAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([content.attachments.download('receita-medica.pdf')]);
  });

  it('diz à familiar que o registro anulado não foi encontrado', async () => {
    // A API responde 404 ao familiar no registro anulado.
    apiStub().use({
      [DETAIL]: () =>
        apiFailure(
          404,
          'FOLLOW_UP_NOT_FOUND',
          'Registro de acompanhamento não encontrado.',
        ),
    });
    renderDetail(ANNULLED, 'family');

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
  });
});
