import { Link } from '@mui/material';
import { termsLinkContent } from '../data/terms.js';
import { apiOrigin } from '../utils/runtimeConfig.js';

/**
 * Link do rodapé para a página pública do termo de uso (`/termos`), que a
 * API serve na própria origem, fora do prefixo `/api`. Abre em outra aba
 * para não tirar ninguém de um formulário pela metade.
 */
export default function TermsLink() {
  return (
    <Link
      href={`${apiOrigin()}/termos`}
      target="_blank"
      rel="noopener noreferrer"
      variant="caption"
      underline="hover"
    >
      {termsLinkContent.label}
    </Link>
  );
}
