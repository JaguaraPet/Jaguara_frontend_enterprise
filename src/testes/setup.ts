import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem os globais do Vitest, a limpeza do DOM entre testes é feita aqui.
afterEach(() => {
  cleanup();
});
