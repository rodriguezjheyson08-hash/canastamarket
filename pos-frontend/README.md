# Frontend

Aplicacion React del sistema MiniMarket POS.

## Puerto

`http://localhost:3000`

El script `npm start` inicia el frontend en esta terminal y se apaga con `Ctrl+C`.
Siempre usa el puerto `3000`; no abre `3001` ni otro puerto alternativo.

## Comandos

```bash
npm install
npm start
npm run build
```

## Estructura

- `src/App.tsx`: rutas principales.
- `src/pages/`: pantallas completas.
- `src/components/`: componentes reutilizables.
- `src/services/`: llamadas al backend.
- `src/contexts/`: estados globales.
- `src/hooks/`: hooks propios.
- `src/types/`: tipos TypeScript.
- `src/utils/`: helpers.
- `scripts/start-fixed-port.js`: fuerza el puerto `3000` y permite controlar el proceso con `Ctrl+C`.

## Configuracion

Archivo activo: `.env`

Plantilla: `../docs/configuracion/frontend.env.plantilla`

Valores principales:

```env
HOST=0.0.0.0
PORT=3000
REACT_APP_API_URL=http://localhost:8083
```
