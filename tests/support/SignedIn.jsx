import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useSession } from '../../src/hooks/useSession.js';
import { credentialsFor } from './fixtures/sessions.js';

// Entra com o usuário de demonstração do perfil pelo login da API, que o
// stub dos testes responde, e só então mostra as rotas filhas, como faz a
// proteção por sessão do aplicativo.
export default function SignedIn({ profile }) {
  const { status, signInWithPassword } = useSession();
  useEffect(() => {
    signInWithPassword(credentialsFor(profile));
  }, [profile, signInWithPassword]);
  return status === 'authenticated' ? <Outlet /> : null;
}
