# Backend POS - MySQL

Este backend conecta el frontend con MySQL para registrar productos, categorías y ventas (control de stock).

## Requisitos
- Node.js 16+
- MySQL 8+

## Configuración rápida
1. Crea/edita el archivo `.env` con tus credenciales.
2. Crea la base de datos y tablas:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   Si ya tenías la base creada, aplica:
   ```bash
   mysql -u root -p < database/alter_usuarios_lockout.sql
   mysql -u root -p < database/alter_usuarios_status.sql
   ```
3. Instala dependencias y levanta la API:
   ```bash
   npm install
   npm start
   ```

La API quedará en `http://localhost:8083/api`.

Variables recomendadas en `.env`:
```env
PORT=8083
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=licoreria_pos
MP_ACCESS_TOKEN=
RENIEC_BASE_URL=https://api.decolecta.com/v1/reniec/dni
RENIEC_TOKEN=tu_token_decolecta
```

## Estructura
```
pos-backend/
├── database/            # Scripts SQL
├── src/
│   ├── config/          # Variables de entorno
│   ├── controllers/     # Lógica de negocio
│   ├── db/              # Pool de MySQL
│   ├── routes/          # Rutas HTTP
│   └── utils/            # Helpers
└── .env
```

## Endpoints principales
- `GET /api/productos`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`
- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`
- `GET /api/ventas`
- `POST /api/ventas`
- `GET /api/dashboard/stats`
- `POST /api/auth/login`
- `GET /api/dni/:dni`

## Notas
- El backend ahora usa contraseñas con hash y tokens firmados.
- Antes de producción configura `AUTH_SECRET` y `CORS_ORIGIN`.
- El `schema.sql` ya no crea usuarios demo por defecto. Debes provisionar el primer administrador manualmente.
- Si cambias el puerto del backend, actualiza `REACT_APP_API_URL` en el frontend.
