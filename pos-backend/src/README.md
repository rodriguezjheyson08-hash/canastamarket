# Backend src

- `index.js`: crea Express, registra middleware y monta rutas.
- `config/`: variables y configuracion HTTP compartida.
- `middleware/`: middleware de Express reutilizable.
- `routes/`: define endpoints y permisos; no debe tener logica de negocio larga.
- `controllers/`: recibe `req/res`, coordina base de datos y responde a la API.
- `features/`: helpers por modulo cuando un controlador crece demasiado.
  - `proveedores/`: mapeos, validaciones y formato CSV de proveedores/pedidos de compra.
  - `ventas/`: esquema opcional y mapeo de ventas.
- `db/`: conexion a MySQL.
- `utils/`: utilidades transversales: auth, permisos, rate limit, catalogo.
- `pagos/`: integracion Mercado Pago.
- `apidni/`: integraciones externas de DNI/RUC.

Regla practica: si un archivo de `controllers/` empieza a mezclar validaciones, transformaciones o constantes largas, mover esa parte a `features/<modulo>/`.

