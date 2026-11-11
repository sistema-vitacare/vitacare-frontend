import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useSession } from '../../src/hooks/useSession.js';

// Entra com o perfil de demonstração e só então mostra as rotas filhas,
// como faz a proteção por sessão do aplicativo.
export default function SignedIn({ profile }) {
  const { status, signIn } = useSession();
  useEffect(() => {
    signIn(profile);
  }, [profile, signIn]);
  return status === 'authenticated' ? <Outlet /> : null;
}
