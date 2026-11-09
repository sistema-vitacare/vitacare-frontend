import { alpha, createTheme } from '@mui/material/styles';

// Único lugar do projeto com valores de cor. Componentes usam os tokens do
// tema (`primary.main`, `text.secondary`, `theme.palette.brand.navy`); um
// teste barra cor fixa em qualquer outro arquivo de `src/`.
const navy = '#183058';
const teal = '#0D7D77';
const tealDark = '#0B6B66';
const tealTint = '#E7F4F3';
const textSecondary = '#5B6B82';

const easeOut = 'cubic-bezier(0.16, 1, 0.3, 1)';
const cardShadow = `0 1px 2px ${alpha(navy, 0.04)}, 0 8px 24px -12px ${alpha(navy, 0.14)}`;

export const theme = createTheme({
  palette: {
    primary: {
      main: teal,
      // Texto sobre o fundo teal-claro: o teal de ação ali não atinge 4,5:1.
      dark: tealDark,
      light: tealTint,
      contrastText: '#FFFFFF',
    },
    text: { primary: navy, secondary: textSecondary },
    background: { default: '#F3F5F7', paper: '#FFFFFF' },
    divider: alpha(navy, 0.08),
    error: { main: '#B42318', light: '#FEF3F2' },
    warning: { main: '#B54708', light: '#FFFAEB' },
    info: { main: '#175CD3', light: '#EFF8FF' },
    success: { main: '#067647', light: '#ECFDF3' },
    brand: {
      navy,
      // Teal dos protótipos: só decoração (gráficos, selos), nunca texto.
      accent: '#00B69B',
      onNavy: '#FFFFFF',
      onNavyMuted: '#C5D3E8',
    },
  },
  shape: { borderRadius: 10, cardRadius: 16 },
  typography: {
    fontFamily: '"Plus Jakarta Sans Variable", system-ui, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.25rem', fontWeight: 650, letterSpacing: '-0.01em' },
    h3: { fontSize: '1rem', fontWeight: 650 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      lineHeight: 1.6,
    },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  customShadows: { card: cardShadow },
  transitions: { easing: { easeOut } },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Algarismos de largura fixa alinham valores em tabelas e indicadores.
        body: { fontVariantNumeric: 'tabular-nums' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          paddingInline: 18,
          // Só transform anima: cor e tamanho mudam sem transição, sem custo de
          // repintura contínua.
          transition: `transform 160ms ${easeOut}`,
          '&:active': { transform: 'scale(0.98)' },
        },
        sizeLarge: { paddingBlock: 12, fontSize: '0.9375rem' },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 16 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha(navy, 0.06)}`,
          boxShadow: cardShadow,
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(navy, 0.16),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(navy, 0.32),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: '0.75rem',
          fontWeight: 600,
          color: textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
        root: { borderColor: alpha(navy, 0.06) },
      },
    },
  },
});
