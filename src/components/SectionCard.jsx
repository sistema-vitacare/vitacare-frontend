import { Box, Card, Stack, Typography } from '@mui/material';

/**
 * Cartão de uma seção das telas de detalhe: título, subtítulo opcional, uma
 * ação opcional à direita do título e o conteúdo.
 */
export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Card>
  );
}
