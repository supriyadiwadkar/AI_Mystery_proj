import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './ui';

describe('landing page', () => {
  it('shows the investigation call to action', () => {
    window.scrollTo = () => {};
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: /every clue has a shadow/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /begin an investigation/i })).toBeTruthy();
  });
});
