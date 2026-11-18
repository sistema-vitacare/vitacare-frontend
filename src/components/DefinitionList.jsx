import { Box, Typography } from '@mui/material';

/**
 * Pares de rótulo e valor das telas de detalhe, em duas colunas a partir de
 * 600 px. `rows` é uma lista de `[rótulo, valor]`; o valor pode ser texto ou
 * um elemento, como um link ou um selo.
 */
export default function DefinitionList({ rows }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
      }}
    >
      {rows.map(([label, value]) => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Typography component="dt" variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
