const http = require('http');
const net = require('net');
const { execFileSync, spawn } = require('child_process');

const BACKEND_PORT = Number(process.env.PORT || 8083);
const HOST = '0.0.0.0';
const LOCAL_HEALTH_URL = `http://localhost:${BACKEND_PORT}/api/health`;

const getPortOwner = () => {
  try {
    const command = `
      $conn = Get-NetTCPConnection -LocalPort ${BACKEND_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;
      if ($conn) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)";
        [pscustomobject]@{ ProcessId=$conn.OwningProcess; CommandLine=$proc.CommandLine } | ConvertTo-Json -Compress
      }
    `;
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return output ? JSON.parse(output) : null;
  } catch {
    return null;
  }
};

const stopProcess = (pid) => {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Stop-Process -Id ${pid} -Force`], {
    stdio: 'ignore'
  });
};

const checkExistingBackend = () => new Promise((resolve) => {
  const req = http.get(LOCAL_HEALTH_URL, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(res.statusCode === 200 && body?.status === 'ok');
      } catch {
        resolve(false);
      }
    });
  });

  req.setTimeout(1500, () => {
    req.destroy();
    resolve(false);
  });

  req.on('error', () => resolve(false));
});

const startNode = () => {
  const child = spawn('node', ['src/index.js'], {
    env: process.env,
    shell: true,
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
};

const startWhenPortIsFree = (retry = 0) => {
  const probe = net.createServer();

  probe.once('error', async (error) => {
    if (error.code === 'EADDRINUSE') {
      const owner = getPortOwner();
      const isBackendRunning = await checkExistingBackend();
      if (retry === 0 && owner?.ProcessId && isBackendRunning) {
        console.log(`Cerrando backend anterior del proyecto en el puerto ${BACKEND_PORT}...`);
        stopProcess(owner.ProcessId);
        setTimeout(() => startWhenPortIsFree(retry + 1), 1200);
        return;
      }

      console.error(`El puerto ${BACKEND_PORT} ya está ocupado por otro proceso.`);
      console.error('Cierra ese proceso y vuelve a ejecutar npm start.');
      process.exit(1);
    }

    console.error(error.message || error);
    process.exit(1);
  });

  probe.once('listening', () => {
    probe.close(startNode);
  });

  probe.listen(BACKEND_PORT, HOST);
};

startWhenPortIsFree();
