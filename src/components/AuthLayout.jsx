import { Box, Stack, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { CheckCircle } from '@phosphor-icons/react';
import { accessLayout } from '../data/access.js';
import { appInfo } from '../data/app.js';
import { shellContent } from '../data/navigation.js';

// Entrada do formulário só com opacidade e deslocamento; o tema zera a
// duração quando o sistema pede movimento reduzido.
const enter = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

/**
 * Molde das telas de acesso: marca à esquerda a partir de 900 px e, ao lado,
 * o título da tela e o conteúdo. No celular, só a coluna do formulário, para
 * que ele apareça sem rolagem.
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
        bgcolor: 'background.paper',
      }}
    >
      <Box
        component="aside"
        sx={(theme) => ({
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          py: 8,
          color: 'brand.onNavy',
          bgcolor: 'brand.navy',
          backgroundImage: `radial-gradient(60% 50% at 85% 10%, ${alpha(theme.palette.brand.accent, 0.22)} 0%, transparent 70%), radial-gradient(50% 40% at 0% 100%, ${alpha(theme.palette.primary.main, 0.35)} 0%, transparent 70%)`,
        })}
      >
        <Box sx={{ maxWidth: 480 }}>
          <Typography
            component="p"
            sx={{
              fontSize: '2.25rem',
              fontWeight: 650,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            }}
          >
            {accessLayout.brandTitle}
          </Typography>
          <Typography sx={{ mt: 2, color: 'brand.onNavyMuted' }}>
            {accessLayout.brandText}
          </Typography>
          <Stack component="ul" spacing={1.5} sx={{ mt: 4, p: 0 }}>
            {accessLayout.highlights.map((highlight) => (
              <Stack
                key={highlight}
                component="li"
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', listStyle: 'none' }}
              >
                <Box
                  component="span"
                  sx={{ display: 'flex', color: 'brand.accent' }}
                >
                  <CheckCircle size={20} weight="duotone" aria-hidden />
                </Box>
                <Typography variant="body2" sx={{ color: 'brand.onNavy' }}>
                  {highlight}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 2, sm: 6, md: 10 },
          py: { xs: 5, md: 8 },
        }}
      >
        <Box
          sx={(theme) => ({
            width: '100%',
            maxWidth: 400,
            mx: 'auto',
            animation: `${enter} 420ms ${theme.transitions.easing.easeOut} both`,
          })}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: 'center', mb: 4 }}
          >
            <Box
              component="img"
              src="/logo-mark.png"
              alt=""
              sx={{ height: 32, display: 'block' }}
            />
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '1.375rem',
                letterSpacing: '-0.02em',
              }}
            >
              {shellContent.brandStart}
              <Box component="span" sx={{ color: 'primary.main' }}>
                {shellContent.brandEnd}
              </Box>
            </Typography>
          </Stack>
          <Typography variant="h1">{title}</Typography>
          {subtitle ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          ) : null}
          <Box sx={{ mt: 4 }}>{children}</Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 5 }}
          >
            {appInfo.description}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
