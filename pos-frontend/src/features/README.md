# Estructura frontend por modulo

Esta carpeta separa lo que pertenece a cada modulo de negocio.

## Regla de organizacion

- `features/<modulo>/styles.ts`: DISEÑO del modulo, estilos `sx`, medidas, espacios y colores.
- `features/<modulo>/types.ts`: tipos propios del modulo.
- `features/<modulo>/utils.ts`: LOGICA pura que no depende de React.
- `features/<modulo>/constants.ts`: valores fijos del modulo.
- `pages/*.tsx`: estructura de pantalla, estados de React y conexion con servicios.
- `services/*.ts`: llamadas HTTP al backend.
- `components/forms/*.tsx`: formularios reutilizables.

## Comentarios en codigo

- `DISEÑO`: marca lo que pinta la interfaz, por ejemplo botones, tablas, buscadores, modales y estilos.
- `LOGICA`: marca lo que hace funcionar la pantalla, por ejemplo cargar datos, filtrar, validar, guardar o eliminar.

## Estado actual

- `ventas` ya tiene una carpeta `features/ventas`.
- `proveedores` queda como patron con `features/proveedores/styles.ts`.
- Los siguientes modulos que deberian migrarse al mismo patron son `productos`, `categorias`, `inicio`, `dashboard`, `login` y `configuracion`.

