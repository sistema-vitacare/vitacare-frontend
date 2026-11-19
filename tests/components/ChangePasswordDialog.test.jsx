import { ThemeProvider } from '@mui/material';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordDialog from '../../src/components/ChangePasswordDialog.jsx';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import {
  accessFields,
  changePasswordContent as content,
  fieldErrorMessages,
} from '../../src/data/access.js';
import { useSession } from '../../src/hooks/useSession.js';
import { resetMockState } from '../../src/services/mockApi.js';
import { theme } from '../../src/styles/theme.js';
import { apiFailure, apiStub } from '../support/apiStub.js';
import { credentialsFor } from '../support/fixtures/sessions.js';

const admin = credentialsFor('admin');

// Entra como administradora e mostra o estado da sessão ao lado do diálogo,
// para conferir que a troca encerra a sessão.
function Harness({ onClose }) {
  const { status, signInWithPassword } = useSession();
  useEffect(() => {
    signInWithPassword(admin);
  }, [signInWithPassword]);
  return (
    <>
      <p>Sessão: {status}</p>
      {status === 'authenticated' ? (
        <ChangePasswordDialog onClose={onClose} />
      ) : null}
    </>
  );
}

function renderDialog() {
  const onClose = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <SessionProvider>
        <Harness onClose={onClose} />
      </SessionProvider>
    </ThemeProvider>,
  );
  return onClose;
}

async function fill(values) {
  const dialog = await screen.findByRole('dialog', { name: content.title });
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(within(dialog).getByLabelText(accessFields[name].label), {
      target: { value },
    });
  }
  return dialog;
}

const submit = (dialog) =>
  fireEvent.click(within(dialog).getByRole('button', { name: content.submit }));

afterEach(() => {
  resetMockState();
});

describe('ChangePasswordDialog', () => {
  it('explica que a troca encerra as sessões', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog', { name: content.title });
    expect(within(dialog).getByText(content.intro)).toBeInTheDocument();
  });

  it('aponta os campos antes do envio', async () => {
    renderDialog();
    const dialog = await fill({
      newPassword: 'curta',
      confirmation: 'outra',
    });

    submit(dialog);

    const { currentPassword, newPassword, confirmation } = fieldErrorMessages;
    expect(
      await within(dialog).findByText(currentPassword.required),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(newPassword.tooShort)).toBeInTheDocument();
    expect(within(dialog).getByText(confirmation.mismatch)).toBeInTheDocument();
  });

  it('aponta a senha atual que não confere', async () => {
    apiStub().use({
      'PUT /auth/password': () =>
        apiFailure(
          422,
          'AUTH_CURRENT_PASSWORD_INVALID',
          'Senha atual inválida.',
        ),
    });
    renderDialog();
    const dialog = await fill({
      currentPassword: 'senha-errada',
      newPassword: 'senha-nova-123',
      confirmation: 'senha-nova-123',
    });

    submit(dialog);

    expect(
      await within(dialog).findByText(fieldErrorMessages.currentPassword.wrong),
    ).toBeInTheDocument();
    expect(screen.getByText('Sessão: authenticated')).toBeInTheDocument();
  });

  it('aponta a nova senha igual à atual', async () => {
    apiStub().use({
      'PUT /auth/password': () =>
        apiFailure(
          422,
          'AUTH_PASSWORD_REUSE',
          'A nova senha não pode ser igual à atual.',
        ),
    });
    renderDialog();
    const dialog = await fill({
      currentPassword: admin.password,
      newPassword: admin.password,
      confirmation: admin.password,
    });

    submit(dialog);

    expect(
      await within(dialog).findByText(
        fieldErrorMessages.newPassword.sameAsCurrent,
      ),
    ).toBeInTheDocument();
  });

  it('troca a senha pela API e encerra a sessão', async () => {
    apiStub().use({ 'PUT /auth/password': () => ({ data: null, meta: {} }) });
    renderDialog();
    const dialog = await fill({
      currentPassword: admin.password,
      newPassword: 'senha-nova-123',
      confirmation: 'senha-nova-123',
    });

    submit(dialog);

    expect(await screen.findByText('Sessão: anonymous')).toBeInTheDocument();
    expect(apiStub().last('PUT /auth/password').body).toEqual({
      currentPassword: admin.password,
      newPassword: 'senha-nova-123',
    });
  });

  it('fecha pelo Cancelar', async () => {
    const onClose = renderDialog();
    const dialog = await screen.findByRole('dialog', { name: content.title });

    fireEvent.click(
      within(dialog).getByRole('button', { name: content.cancel }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
