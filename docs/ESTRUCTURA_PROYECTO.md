# Estructura del Proyecto

## Raiz

- `README.md`: inicio rapido del proyecto.
- `pos-frontend/`: interfaz web.
- `pos-backend/`: API y base de datos.
- `docs/`: documentacion para exposicion.

## Frontend

Ruta base: `pos-frontend/src`

- `App.tsx`: rutas principales y proteccion por permisos.
- `index.tsx`: punto de entrada de React.
- `pages/`: pantallas completas. Los nombres tienen prefijo numerico para mantenerlas ordenadas.
  - `01-InicioPage.tsx`: portada del sistema.
  - `02-LoginPage.tsx`: login del personal.
  - `03-Dashboard.tsx`: resumen principal.
  - `04-CategoriasPage.tsx`: mantenimiento de categorias.
  - `05-ProductosPage.tsx`: mantenimiento de productos.
  - `06-VentasPage.tsx`: pantalla principal de ventas; usa `features/ventas/` para no mezclar toda la logica.
  - `07-ProveedoresPage.tsx`: mantenimiento de proveedores.
  - `08-ConfiguracionPage.tsx`: usuarios, permisos, personalizacion y datos de boleta.
- `components/`: piezas reutilizables.
  - `common/`: botones, loader y acciones comunes.
  - `forms/`: formularios de productos y categorias.
  - `layout/`: encabezados y pie de pagina.
  - `ui/`: componentes visuales pequenos.
- `contexts/`: estado global de autenticacion.
- `features/`: codigo ordenado por modulo cuando una pantalla crece demasiado.
  - `ventas/constants.ts`: constantes de ventas, Mercado Pago, boleta y rutas de imagenes.
  - `ventas/types.ts`: tipos de carrito, cliente de boleta y venta pendiente.
  - `ventas/utils.ts`: validaciones, cantidades, formato de moneda, QR SUNAT y calculos de boleta.
  - `ventas/styles.ts`: estilos Material UI especificos de ventas.
- `hooks/`: hooks reutilizables.
- `services/`: llamadas al backend.
- `styles/`: estilos compartidos entre pantallas y componentes.
  - `buttons.ts`: estilos comunes de botones, iconos y snackbar.
  - `layout.ts`: estilos de layout general y contenedores.
- `types/`: tipos TypeScript.
- `utils/`: helpers de configuracion, permisos, boleta y conversiones.
- `src/README.md`: guia rapida de carpetas del frontend.

Estilos: el frontend usa Material UI con `sx`. Para que sea facil cambiar botones o espacios, los estilos repetidos deben ir en `src/styles/`; los estilos de una funcion grande van en su carpeta `src/features/<modulo>/styles.ts`.

## Donde cambiar rapido

- Botones comunes: `pos-frontend/src/styles/buttons.ts`.
- Espaciado general de pantallas: `pos-frontend/src/styles/layout.ts`.
- Tarjetas de productos, carrito y boleta de ventas: `pos-frontend/src/features/ventas/styles.ts`.
- Reglas de cantidad, dinero, Mercado Pago y boleta SUNAT: `pos-frontend/src/features/ventas/utils.ts`.
- Rutas de pantallas: `pos-frontend/src/App.tsx`.
- Llamadas HTTP al backend: `pos-frontend/src/services/`.

## Backend

Ruta base: `pos-backend/src`

- `index.js`: arranque de Express y registro de rutas.
- `config/env.js`: variables de entorno.
- `config/http.js`: constantes HTTP, CORS y logs del servidor.
- `middleware/`: middleware reutilizable, por ejemplo cabeceras de seguridad.
- `db/pool.js`: conexion MySQL.
- `routes/`: definicion de endpoints.
- `controllers/`: logica de cada modulo.
- `features/`: helpers internos por modulo cuando un controlador crece demasiado.
  - `proveedores/`: validaciones, mapeos y CSV de proveedores.
  - `ventas/`: mapeos y migracion ligera de columnas opcionales de ventas.
- `utils/`: autenticacion, permisos y migraciones ligeras.
- `pagos/`: Mercado Pago.
- `apidni/`: consulta DNI.
- `src/README.md`: guia rapida de carpetas del backend.

## Configuracion

- Frontend activo: `pos-frontend/.env`
- Backend activo: `pos-backend/.env`
- Plantillas limpias: `docs/configuracion/`

## Modulos Activos

- Autenticacion de personal.
- Dashboard.
- Ventas con boleta simple/electronica.
- Productos.
- Categorias.
- Configuracion de usuarios, permisos y boleta.
