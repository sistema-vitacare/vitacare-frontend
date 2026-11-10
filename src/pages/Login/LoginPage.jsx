import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { PATHS, homePath } from '../../constants/routes.js';
import { appInfo } from '../../data/app.js';
import { loginContent } from '../../data/login.js';
import { shellContent } from '../../data/navigation.js';
import { profileLabels } from '../../data/profiles.js';
import { useSession } from '../../hooks/useSession.js';
import { DEMO_PROFILES } from '../../services/authService.js';

/**
 * Entrada no sistema. Por enquanto, só os atalhos de demonstração; o
 * formulário com código da organização, e-mail e senha vem ao lado deles.
 */
export default function LoginPage() {
  const { status, can, signIn } = useSession();
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);

  // Quem já entrou não fica no login. Isso também leva à página inicial logo
  // depois do atalho, quando a sessão passa a `authenticated`.
  if (status === 'authenticated') {
    return <Navigate to={homePath(can) ?? PATHS.HOME} replace />;
  }

  async function handleDemo(profileCode) {
    setPending(profileCode);
    setFailed(false);
    try {
      await signIn(profileCode);
    } catch {
      setFailed(true);
      setPending(null);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
              component="img"
              src="/logo-mark.png"
              alt=""
              sx={{ height: 28, display: 'block' }}
            />
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
              }}
            >
              {shellContent.brandStart}
              <Box component="span" sx={{ color: 'primary.main' }}>
                {shellContent.brandEnd}
              </Box>
            </Typography>
          </Stack>

          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              {loginContent.title}
            </Typography>
            <Typography color="text.secondary">
              {appInfo.description}
            </Typography>
          </Box>

          {status === 'expired' ? (
            <Alert severity="info">{loginContent.expired}</Alert>
          ) : null}
          {failed ? (
            <Alert severity="error">{loginContent.demoError}</Alert>
          ) : null}

          <Box component="section" aria-labelledby="demo-title">
            <Typography
              id="demo-title"
              variant="subtitle2"
              component="h2"
              gutterBottom
            >
              {loginContent.demoTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {loginContent.demoText}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1,
              }}
            >
              {DEMO_PROFILES.map((code) => (
                <Button
                  key={code}
                  variant="outlined"
                  disabled={pending !== null}
                  onClick={() => handleDemo(code)}
                >
                  {profileLabels[code]}
                </Button>
              ))}
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
