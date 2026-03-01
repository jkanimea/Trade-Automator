import { exec } from 'child_process';

console.log('⚡ Starting AlgoTrade Pro Development Environment...');

// Start backend on port 5001
const backend = exec('cd server && node test-server.js', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backend failed to start:', error.message);
    return;
  }
});

backend.stdout.on('data', (data) => {
  console.log(data.toString());
});

backend.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Start frontend on port 3000
const frontend = exec('cd client && vite', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Frontend failed to start:', error.message);
    return;
  }
});

frontend.stdout.on('data', (data) => {
  console.log(data.toString());
});

frontend.stderr.on('data', (data) => {
  console.error(data.toString());
});

console.log('⏳ Starting services...');
console.log('📁 Backend: http://localhost:5001');
console.log('📁 Frontend: http://localhost:3000');
console.log('⏳ Press Ctrl+C to stop all services');