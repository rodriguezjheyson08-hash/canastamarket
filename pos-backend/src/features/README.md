# Estructura backend por modulo

Esta carpeta contiene logica de negocio que no deberia quedarse dentro de `controllers`.

## Regla de organizacion

- `routes/*.js`: define URLs del backend y middleware.
- `controllers/*.js`: recibe `req/res`, llama base de datos o servicios y responde HTTP.
- `features/<modulo>/validators.js`: LOGICA de validacion y limpieza de datos.
- `features/<modulo>/mappers.js`: LOGICA para convertir datos de MySQL a formato frontend.
- `features/<modulo>/schema.js`: reglas o estructura de datos del modulo, si aplica.
- `services` o integraciones externas: llamadas a APIs externas.

## Comentarios en codigo

- `RUTA BACKEND`: marca endpoints que consume el frontend.
- `LOGICA BACKEND`: marca funciones que validan, transforman, consultan o guardan datos.

## Estado actual

- `proveedores`, `productos` y `ventas` ya tienen parte de su logica dentro de `features`.
- Los controllers todavia tienen consultas SQL grandes; lo ideal es moverlas gradualmente a archivos de modelo/repositorio por modulo.

