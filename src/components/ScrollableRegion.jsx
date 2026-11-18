import { Box } from '@mui/material';

/**
 * Área que rola de lado quando o conteúdo não cabe, como uma tabela larga no
 * celular. Sem foco, quem usa só o teclado não consegue rolar até as colunas
 * escondidas; por isso ela recebe foco e tem nome, como região.
 */
export default function ScrollableRegion({ label, children }) {
  return (
    <Box
      role="region"
      aria-label={label}
      tabIndex={0}
      sx={{ overflowX: 'auto' }}
    >
      {children}
    </Box>
  );
}
