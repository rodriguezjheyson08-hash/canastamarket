/* Prueba de carga controlada para endpoints GET sin modificar ventas ni inventario. */
const target = process.argv[2] || 'http://localhost:8083/api/health';
const durationSeconds = Math.max(1, Number(process.argv[3] || 10));
const concurrency = Math.max(1, Math.min(200, Number(process.argv[4] || 20)));
const deadline = Date.now() + durationSeconds * 1000;
const latencies = [];
let ok = 0;
let failed = 0;
const statusCounts = {};
const errorCounts = {};

const worker = async () => {
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(10000) });
      statusCounts[response.status] = (statusCounts[response.status] || 0) + 1;
      if (response.ok) ok += 1;
      else failed += 1;
      await response.arrayBuffer();
    } catch (error) {
      failed += 1;
      const name = error?.name || 'Error';
      errorCounts[name] = (errorCounts[name] || 0) + 1;
    } finally {
      latencies.push(performance.now() - started);
    }
  }
};

Promise.all(Array.from({ length: concurrency }, worker)).then(() => {
  latencies.sort((a, b) => a - b);
  const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
  const total = ok + failed;
  console.log(JSON.stringify({
    target,
    durationSeconds,
    concurrency,
    requests: total,
    successful: ok,
    failed,
    statusCounts,
    errorCounts,
    requestsPerSecond: Number((total / durationSeconds).toFixed(2)),
    latencyMs: { p50: Number(percentile(0.5).toFixed(2)), p95: Number(percentile(0.95).toFixed(2)), p99: Number(percentile(0.99).toFixed(2)) }
  }, null, 2));
  process.exit(failed > 0 ? 1 : 0);
});
