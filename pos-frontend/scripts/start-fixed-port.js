const net = require('net');
const { execFileSync, spawn } = require('child_process');
const path = require('path');

const FRONTEND_PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DUPLICATE_PORTS = Array.from({ length: 11 }, (_, index) => FRONTEND_PORT + index);
const PROJECT_DIR = path.resolve(__dirname, '..').toLowerCase();
const toWindowsPath = (value) => {
  const normalized = String(value || '').replaceAll('/', '\\').toLowerCase();
  const match = normalized.match(/^\\mnt\\([a-z])\\(.*)$/);
  return match ? `${match[1]}:\\${match[2]}` : normalized;
};
const PROJECT_DIR_WINDOWS = toWindowsPath(PROJECT_DIR);

const getPortOwner = () => {
  try {
    const command = `
      $conn = Get-NetTCPConnection -LocalPort ${FRONTEND_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;
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

const getPortOwners = () => {
  try {
    const ports = DUPLICATE_PORTS.join(',');
    const command = `
      Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in ${ports} } |
        ForEach-Object {
          $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)";
          [pscustomobject]@{ ProcessId=$_.OwningProcess; LocalPort=$_.LocalPort; CommandLine=$proc.CommandLine }
        } | ConvertTo-Json -Compress
    `;
    const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (!output) return [];
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

const isSameFrontend = (owner) => {
  const commandLine = String(owner?.CommandLine || '').toLowerCase();
  return commandLine.includes(PROJECT_DIR_WINDOWS) &&
    (commandLine.includes('craco') || commandLine.includes('react-scripts'));
};

const stopProcess = (pid) => {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Stop-Process -Id ${pid} -Force`], {
    stdio: 'ignore'
  });
};

const startCraco = () => {
  const child = spawn('craco', ['start'], {
    env: {
      ...process.env,
      HOST,
      PORT: String(FRONTEND_PORT),
      DANGEROUSLY_DISABLE_HOST_CHECK: process.env.DANGEROUSLY_DISABLE_HOST_CHECK || 'true',
      BROWSER: process.env.BROWSER || 'none'
    },
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

const stopDuplicateFrontends = () => {
  const owners = getPortOwners();
  const seen = new Set();
  for (const owner of owners) {
    if (!owner?.ProcessId || seen.has(owner.ProcessId) || !isSameFrontend(owner)) {
      continue;
    }

    const port = owner.LocalPort || FRONTEND_PORT;
    console.log(`Cerrando frontend anterior del proyecto en el puerto ${port}...`);
    stopProcess(owner.ProcessId);
    seen.add(owner.ProcessId);
  }
};

const startWhenPortIsFree = (retry = 0) => {
  const probe = net.createServer();

  probe.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const owner = getPortOwner();
      if (retry === 0 && isSameFrontend(owner)) {
        console.log(`Cerrando frontend anterior del proyecto en el puerto ${FRONTEND_PORT}...`);
        stopProcess(owner.ProcessId);
        setTimeout(() => startWhenPortIsFree(retry + 1), 1200);
        return;
      }

      console.error(`El puerto ${FRONTEND_PORT} ya está ocupado por otro proceso.`);
      console.error('Cierra ese proceso y vuelve a ejecutar npm start.');
      process.exit(1);
    }

    console.error(error.message || error);
    process.exit(1);
  });

  probe.once('listening', () => {
    probe.close(startCraco);
  });

  probe.listen(FRONTEND_PORT, HOST);
};

stopDuplicateFrontends();
setTimeout(startWhenPortIsFree, 1200);
