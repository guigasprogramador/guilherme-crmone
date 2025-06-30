// script para inserir dados e testar a API de licitações
fetch('http://localhost:3000/api/licitacoes/seed-data')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Erro ao inserir dados: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Dados inseridos com sucesso:', data);
    return fetch('http://localhost:3000/api/licitacoes');
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Erro ao buscar licitações: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(licitacoes => {
    console.log('Licitações encontradas:', licitacoes.length);
    console.log('Primeira licitação:', JSON.stringify(licitacoes[0], null, 2));
  })
  .catch(error => {
    console.error('Erro:', error);
  });
