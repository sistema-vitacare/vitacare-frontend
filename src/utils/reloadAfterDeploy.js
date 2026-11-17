// Depois de um deploy, os arquivos de tela do build anterior somem do
// servidor, e quem ficou com a página aberta não consegue abrir outra tela.
// Recarregar traz o `index.html` novo, com os arquivos novos. O intervalo
// impede que a página recarregue sem parar quando o arquivo falta mesmo no
// build novo: a segunda falha segue para a tela de erro.
export const RELOAD_INTERVAL_MS = 60 * 1000;

const STORAGE_KEY = 'vitacare:reloaded-after-deploy';

/**
 * Recarrega a página quando o arquivo de uma tela não carrega, no máximo uma
 * vez por intervalo. A hora da recarga fica no `sessionStorage`, que
 * sobrevive à recarga; sem ele, não há como parar, e a página não recarrega.
 * Devolve se recarregou.
 */
export function reloadAfterDeploy({
  getStorage = () => window.sessionStorage,
  now = Date.now(),
  reload = () => window.location.reload(),
} = {}) {
  try {
    const storage = getStorage();
    const last = Number(storage.getItem(STORAGE_KEY));
    if (now - last < RELOAD_INTERVAL_MS) {
      return false;
    }
    storage.setItem(STORAGE_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}
