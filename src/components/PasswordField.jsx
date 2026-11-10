import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useState } from 'react';
import { passwordToggle } from '../data/access.js';

/**
 * Campo de senha com o botão de mostrar e ocultar. Repassa ao `TextField`
 * todas as outras propriedades (rótulo, valor, erro, `autoComplete`).
 */
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? passwordToggle.hide : passwordToggle.show;

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={toggleLabel}
                edge="end"
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
