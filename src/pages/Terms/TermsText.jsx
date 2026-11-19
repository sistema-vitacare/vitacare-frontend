import { Box, Typography } from '@mui/material';
import { Fragment } from 'react';
import { parseTerms } from '../../utils/termsMarkdown.js';

function Inline({ parts }) {
  return parts.map((part, index) =>
    part.bold ? (
      <strong key={index}>{part.text}</strong>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  );
}

// O título da tela é o `h1`; os títulos do texto descem um nível.
const HEADINGS = {
  1: { component: 'h2', variant: 'h3' },
  2: { component: 'h3', variant: 'subtitle1' },
};

function Block({ block }) {
  if (block.type === 'heading') {
    const { component, variant } = HEADINGS[block.level];
    return (
      <Typography
        component={component}
        variant={variant}
        sx={{ mt: 3, mb: 1, fontWeight: 650 }}
      >
        <Inline parts={block.content} />
      </Typography>
    );
  }
  if (block.type === 'list') {
    return (
      <Box component={block.ordered ? 'ol' : 'ul'} sx={{ my: 1, pl: 3 }}>
        {block.items.map((item, index) => (
          <Typography
            key={index}
            component="li"
            variant="body2"
            sx={{ mb: 0.5 }}
          >
            <Inline parts={item} />
          </Typography>
        ))}
      </Box>
    );
  }
  return (
    <Typography variant="body2" sx={{ my: 1 }}>
      <Inline parts={block.content} />
    </Typography>
  );
}

/** Texto do termo, montado em React a partir do Markdown da API. */
export default function TermsText({ markdown }) {
  return parseTerms(markdown).map((block, index) => (
    <Block key={index} block={block} />
  ));
}
