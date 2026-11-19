# Configuracion

Estas plantillas sirven para recrear los archivos `.env` sin buscar valores en varios lugares.

## Frontend

Plantilla: `frontend.env.plantilla`

Archivo activo: `pos-frontend/.env`

Valores clave:

```env
HOST=0.0.0.0
PORT=3000
REACT_APP_API_URL=http://localhost:8083
REACT_APP_MP_BACK_URL_BASE=http://localhost:3000
```

## Backend

Plantilla: `backend.env.plantilla`

Archivo activo: `pos-backend/.env`

Valores clave:

```env
PORT=8083
CORS_ORIGIN=http://localhost:3000
```
