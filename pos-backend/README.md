# Backend

API Express del sistema MiniMarket POS.

## Puerto

`http://localhost:8083/api`

El script `npm start` inicia el backend en esta terminal y se apaga con `Ctrl+C`.
Siempre usa el puerto `8083`; no abre otro puerto alternativo.

## Comandos

```bash
npm install
npm start
npm run dev
```

## Estructura

- `src/index.js`: aplicacion Express.
- `scripts/start-fixed-port.js`: fuerza el puerto `8083` y permite controlar el proceso con `Ctrl+C`.
- `src/config/env.js`: lectura de variables `.env`.
- `src/db/pool.js`: conexion MySQL.
- `src/routes/`: endpoints HTTP.
- `src/controllers/`: logica de negocio.
- `src/utils/`: helpers de autenticacion, permisos y migraciones.
- `src/pagos/`: integracion Mercado Pago.
- `src/apidni/`: consulta externa de DNI.
- `database/`: scripts SQL.

## Configuracion

Archivo activo: `.env`

Plantilla: `../docs/configuracion/backend.env.plantilla`

Valores principales:

```env
PORT=8083
CORS_ORIGIN=http://localhost:3000
DB_NAME=licoreria_pos
```
