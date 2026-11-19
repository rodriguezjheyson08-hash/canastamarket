# MiniMarket POS

Sistema de punto de venta para minimarket/licoreria con frontend React y backend Node.js.

## Puertos

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8083/api`

## Ejecucion

Backend:

```bash
cd pos-backend
npm install
npm start
```

Frontend:

```bash
cd pos-frontend
npm install
npm start
```

Cada servidor se controla desde su propia terminal: `npm start` inicia y `Ctrl+C` apaga.
El frontend usa solo el puerto `3000` y el backend solo el `8083`; no se abre un puerto alternativo.

## Carpetas principales

- `pos-frontend/`: aplicacion React, paginas, componentes y servicios API.
- `pos-backend/`: API Express, controladores, rutas y conexion MySQL.
- `docs/`: guias de estructura y configuracion para exposicion.

La guia de ubicacion rapida esta en [docs/ESTRUCTURA_PROYECTO.md](docs/ESTRUCTURA_PROYECTO.md).
