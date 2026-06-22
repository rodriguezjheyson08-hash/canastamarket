# Frontend src

- `App.tsx`: rutas principales, layouts y permisos.
- `pages/`: pantallas completas. El prefijo numerico mantiene el orden visible del sistema.
- `components/`: piezas reutilizables.
  - `common/`: botones, loaders y acciones compartidas.
  - `forms/`: formularios reutilizables.
  - `layout/`: header/footer.
  - `ui/`: componentes visuales pequenos.
- `features/`: logica y estilos de un modulo cuando una pantalla crece demasiado.
  - `ventas/`: constantes, tipos, estilos y utilidades de ventas/boletas.
- `services/`: llamadas HTTP al backend.
- `contexts/`: estado global.
- `hooks/`: hooks reutilizables.
- `styles/`: estilos compartidos de Material UI.
- `utils/`: helpers transversales.
- `types/`: tipos TypeScript globales.

Regla practica: las pantallas deben coordinar UI y estado; la logica repetible debe ir a `features/`, `services/`, `hooks/` o `utils/`.

