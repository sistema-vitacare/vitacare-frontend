import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RequirePermission from '../../src/components/RequirePermission.jsx';
import SessionProvider from '../../src/components/SessionProvider.jsx';
import { useSession } from '../../src/hooks/useSession.js';

function renderProtected() {
  const loadData = vi.fn();
  let session;

  function CaptureSession() {
    session = useSession();
    return null;
  }

  function ProtectedData() {
    loadData();
    return <p>Dados protegidos</p>;
  }

  render(
    <SessionProvider>
      <CaptureSession />
      <RequirePermission
        permission="patients:create"
        fallback={<p>Acesso negado</p>}
      >
        <ProtectedData />
      </RequirePermission>
    </SessionProvider>,
  );

  return { loadData, signIn: (profile) => act(() => session.signIn(profile)) };
}

describe('RequirePermission', () => {
  it('mostra o conteúdo quando o perfil tem a permissão', async () => {
    const { signIn } = renderProtected();

    await signIn('professional');

    expect(screen.getByText('Dados protegidos')).toBeInTheDocument();
    expect(screen.queryByText('Acesso negado')).not.toBeInTheDocument();
  });

  it('mostra o conteúdo alternativo e nem renderiza o protegido sem a permissão', async () => {
    const { loadData, signIn } = renderProtected();

    await signIn('family');

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(screen.queryByText('Dados protegidos')).not.toBeInTheDocument();
    expect(loadData).not.toHaveBeenCalled();
  });

  it('não renderiza o conteúdo protegido sem sessão', () => {
    const { loadData } = renderProtected();

    expect(screen.queryByText('Dados protegidos')).not.toBeInTheDocument();
    expect(loadData).not.toHaveBeenCalled();
  });
});
