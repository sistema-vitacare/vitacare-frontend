import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PERIOD_SHORTCUTS } from '../../constants/dashboard.js';
import { dashboardContent as content } from '../../data/dashboardPages.js';

/** Atalhos de período do painel e do detalhe dos indicadores. */
export default function PeriodShortcuts({ value, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => {
        // Clicar no atalho já escolhido não deixa o painel sem período.
        if (next) {
          onChange(next);
        }
      }}
      aria-label={content.shortcutsLabel}
    >
      {PERIOD_SHORTCUTS.map((shortcut) => (
        <ToggleButton key={shortcut} value={shortcut}>
          {content.shortcuts[shortcut]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
