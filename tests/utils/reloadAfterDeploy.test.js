import { describe, expect, it, vi } from 'vitest';
import {
  RELOAD_INTERVAL_MS,
  reloadAfterDeploy,
} from '../../src/utils/reloadAfterDeploy.js';

const NOW = Date.parse('2026-11-16T15:00:00.000Z');

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

function attempt(storage, now) {
  const reload = vi.fn();
  const reloaded = reloadAfterDeploy({
    getStorage: () => storage,
    now,
    reload,
  });
  return { reloaded, reload };
}

describe('recarga depois de um deploy', () => {
  it('recarrega na primeira falha ao carregar o arquivo de uma tela', () => {
    const { reloaded, reload } = attempt(memoryStorage(), NOW);

    expect(reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('não recarrega de novo dentro de um minuto, para a falha seguir até a tela de erro', () => {
    const storage = memoryStorage();
    attempt(storage, NOW);

    const { reloaded, reload } = attempt(storage, NOW + RELOAD_INTERVAL_MS - 1);

    expect(reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('recarrega de novo depois de um minuto, como num deploy seguinte', () => {
    const storage = memoryStorage();
    attempt(storage, NOW);

    const { reloaded, reload } = attempt(storage, NOW + RELOAD_INTERVAL_MS);

    expect(reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('sem sessionStorage, não recarrega, porque não teria como parar', () => {
    const reload = vi.fn();

    const reloaded = reloadAfterDeploy({
      getStorage: () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
      now: NOW,
      reload,
    });

    expect(reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
