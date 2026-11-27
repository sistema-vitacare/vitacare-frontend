import { describe, expect, it } from 'vitest';
import { login } from '../../src/services/authService.js';
import {
  acceptTerms,
  getCurrentTerms,
} from '../../src/services/termsService.js';
import { apiStub } from '../support/apiStub.js';
import { credentialsFor, demoUser } from '../support/fixtures/sessions.js';

const TERMS = {
  version: 2,
  title: 'Termo de Uso e Privacidade do VitaCare',
  content: '# Termo de Uso e Privacidade do VitaCare\n\nVersão 2',
  contentHash: 'a'.repeat(64),
  publishedAt: '2026-11-13T12:00:00.000Z',
  pageUrl: '/termos?versao=2',
};

describe('termsService', () => {
  it('lê o termo vigente pela rota pública, sem token', async () => {
    await login(credentialsFor('admin'));
    apiStub().use({ 'GET /terms/current': () => ({ data: TERMS, meta: {} }) });

    const { data } = await getCurrentTerms();

    expect(data).toEqual(TERMS);
    expect(apiStub().last('GET /terms/current').token).toBeNull();
  });

  it('aceita a versão lida, com o token da sessão', async () => {
    await login(credentialsFor('admin'));
    apiStub().use({
      'POST /terms/acceptances': ({ body }) => ({
        data: { version: body.version, alreadyAccepted: false },
        meta: {},
      }),
    });

    const { data } = await acceptTerms(2);

    expect(data.version).toBe(2);
    expect(apiStub().last('POST /terms/acceptances')).toMatchObject({
      body: { version: 2 },
      token: `token-${demoUser('admin').id}`,
    });
  });
});
