import { render, screen } from '@testing-library/react';
import App from './App';

test('renders game-o-hub auth page', () => {
  render(<App />);
  const subtitleElement = screen.getByText(/CYBERPUNK MULTIPLAYER PORTAL/i);
  expect(subtitleElement).toBeInTheDocument();
});
