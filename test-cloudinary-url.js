const https = require('https');
const http = require('http');

// URL do erro que está aparecendo no console
const testUrl = 'https://res.cloudinary.com/dss74q6ld/raw/upload/v1750957371/crm_documents/7047edc5-6620-48a1-a0a3-609972f28e25.pdf';

console.log('Testando URL do Cloudinary:', testUrl);

// Função para testar a URL
function testCloudinaryUrl(url) {
  const urlObj = new URL(url);
  const client = urlObj.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'HEAD'
  };
  
  const req = client.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    if (res.statusCode === 200) {
      console.log('✅ URL acessível!');
    } else if (res.statusCode === 404) {
      console.log('❌ Arquivo não encontrado (404)');
      console.log('Possíveis causas:');
      console.log('1. O arquivo não foi enviado corretamente para o Cloudinary');
      console.log('2. O public_id está incorreto');
      console.log('3. O resource_type está incorreto (deveria ser "raw" para PDFs)');
    } else {
      console.log('⚠️ Status inesperado:', res.statusCode);
    }
  });
  
  req.on('error', (err) => {
    console.error('❌ Erro na requisição:', err.message);
  });
  
  req.end();
}

// Testar também a versão com image/upload para comparar
const imageUrl = testUrl.replace('/raw/upload/', '/image/upload/');
console.log('\nTestando também a versão image/upload:', imageUrl);

testCloudinaryUrl(testUrl);

setTimeout(() => {
  console.log('\n--- Testando versão image/upload ---');
  testCloudinaryUrl(imageUrl);
}, 2000);