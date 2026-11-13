/**
 * Entrega ao navegador o arquivo que o serviço devolveu (PDF do relatório,
 * CSV da auditoria). As rotas de arquivo da API exigem o Bearer, então o
 * link direto não serve: a tela recebe o `Blob` e o nome do
 * `Content-Disposition` e baixa por um endereço temporário, liberado em
 * seguida para não reter o arquivo na memória.
 */
export function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
