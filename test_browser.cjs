const http = require('http');
http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('HTML Loaded length:', data.length));
}).on('error', (err) => console.error('Error fetching:', err));