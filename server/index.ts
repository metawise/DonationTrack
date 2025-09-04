// Next.js server wrapper for Replit
import { spawn } from 'child_process';

const port = process.env.PORT || 5000;

// Start Next.js directly
const nextProcess = spawn('npx', ['next', 'dev', '--port', port.toString(), '--hostname', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  process.exit(code || 0);
});