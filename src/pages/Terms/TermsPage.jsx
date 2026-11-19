import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Navigate } from 'react-router';
import AuthLayout from '../../components/AuthLayout.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PATHS, homePath } from '../../constants/routes.js';
import { accessErrors } from '../../data/access.js';
import { termsContent } from '../../data/terms.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import {
  TERMS_ERRORS,
  acceptTerms,
  getCurrentTerms,
} from '../../services/termsService.js';
import { formatDate, todayInSaoPaulo } from '../../utils/format.js';
import { apiOrigin } from '../../utils/runtimeConfig.js';
import TermsText from './TermsText.jsx';

/**
 * Termo de uso e privacidade vigente (BE-32): quem ainda não aceitou a versão
 * vigente só vê esta tela e o Sair, como a API, que recusa as outras rotas
 * até o aceite. O aceite libera a mesma sessão, sem novo login.
 */
export default function TermsPage() {
  const { status, can, reloadSession, signOut } = useSession();
  const resource = useResource(getCurrentTerms);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(null);

  if (status === 'authenticated') {
    return <Navigate to={homePath(can) ?? PATHS.HOME} replace />;
  }
  if (status === 'restricted') {
    return <Navigate to={PATHS.FIRST_ACCESS} replace />;
  }
  if (status !== 'terms') {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  async function handleAccept(version) {
    setNotice(null);
    setPending(true);
    try {
      await acceptTerms(version);
      // As permissões só chegam pelo GET /profile depois do aceite.
      await reloadSession();
    } catch (error) {
      setPending(false);
      if (error.code === TERMS_ERRORS.VERSION_NOT_CURRENT) {
        // Saiu outra versão enquanto a pessoa lia: o aceite tem de ser do
        // texto novo, então ele é lido de novo.
        setNotice({ severity: 'info', text: error.message });
        resource.retry();
      } else {
        setNotice({ severity: 'error', text: accessErrors.unexpected });
      }
    }
  }

  return (
    <AuthLayout title={termsContent.title} subtitle={termsContent.intro}>
      <Stack spacing={2.5}>
        {notice ? (
          <Alert severity={notice.severity}>{notice.text}</Alert>
        ) : null}
        <ResourceState resource={resource}>
          {(terms) => (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                {termsContent.version(
                  terms.version,
                  formatDate(todayInSaoPaulo(new Date(terms.publishedAt))),
                )}
              </Typography>
              <div>
                <TermsText markdown={terms.content} />
              </div>
              <Link
                href={`${apiOrigin()}${terms.pageUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{ fontWeight: 600 }}
              >
                {termsContent.openPage}
              </Link>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  loading={pending}
                  onClick={() => handleAccept(terms.version)}
                >
                  {termsContent.accept}
                </Button>
                <Button size="large" disabled={pending} onClick={signOut}>
                  {termsContent.signOut}
                </Button>
              </Stack>
            </Stack>
          )}
        </ResourceState>
      </Stack>
    </AuthLayout>
  );
}
