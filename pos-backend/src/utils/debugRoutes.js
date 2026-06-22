/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/debugRoutes.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD BACKEND - DEBUG DE RUTAS:
// Ayuda a imprimir o revisar rutas registradas durante diagnostico del servidor.
// UTILIDAD BACKEND - CAMBIOS: aqui se modifica como se listan rutas para diagnostico.
const getRouteMethods = (route) =>
  Object.keys(route.methods || {}).filter((method) => route.methods[method]);

const collectDebugRoutes = (app) => {
  const routes = [];
  const stack = app._router?.stack || [];

  for (const layer of stack) {
    if (layer?.route?.path) {
      routes.push({ path: layer.route.path, methods: getRouteMethods(layer.route) });
      continue;
    }

    if (layer?.name !== 'router' || !layer?.handle?.stack) {
      continue;
    }

    for (const nestedLayer of layer.handle.stack) {
      if (!nestedLayer?.route?.path) {
        continue;
      }

      routes.push({
        path: nestedLayer.route.path,
        methods: getRouteMethods(nestedLayer.route),
        base: layer.regexp?.toString?.() || ''
      });
    }
  }

  return routes;
};

module.exports = { collectDebugRoutes };

