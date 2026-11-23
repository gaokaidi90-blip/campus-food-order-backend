// 简单测试中转 API
const https = require('https');

const apiKey = process.env.ANTHROPIC_API_KEY;
const apiBaseUrl = process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com';

console.log('Testing API...');
console.log('API Base URL:', apiBaseUrl);
console.log('API Key exists:', !!apiKey);

const url = new URL(apiBaseUrl);
const requestBody = JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'Hello' }]
});

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
    'anthropic-version': '2023-06-01',
    'x-api-key': apiKey
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(requestBody);
req.end();
