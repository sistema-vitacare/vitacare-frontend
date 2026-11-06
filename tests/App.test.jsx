import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import { appInfo } from '../src/data/app.js';

describe('App', () => {
  it('exibe o nome do produto como título principal', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: appInfo.name }),
    ).toBeInTheDocument();
  });

  it('exibe a descrição do produto', () => {
    render(<App />);

    expect(screen.getByText(appInfo.description)).toBeInTheDocument();
  });
});
