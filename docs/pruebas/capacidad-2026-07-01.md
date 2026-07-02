# Prueba de capacidad y política de datos

Fecha: 2026-07-01. Entorno: backend local y base de datos local de desarrollo. Estas cifras no constituyen un SLA de producción.

## Resultados medidos

- Salud HTTP: 10,102 respuestas correctas en 10 segundos, 20 solicitudes concurrentes, 0 errores, 1,010.2 req/s, p95 31.24 ms.
- Catálogo con MySQL: 6,139 respuestas correctas en 10 segundos, 5 solicitudes concurrentes, 0 errores, 613.9 req/s, p95 12.68 ms.
- Con 10 solicitudes concurrentes al catálogo se observaron 9 fallos entre 4,164 solicitudes. Por eso no se usa ese punto como capacidad garantizada.

## Capacidad operativa recomendada

- Alcance inicial prudente: 2 a 5 cajeros y hasta 50 clientes navegando simultáneamente.
- Con 2 cajeros y una venta cada 2 minutos por cajero: hasta 960 ventas en una jornada de 16 horas.
- Límite humano teórico a una venta por minuto por cajero: 1,920 ventas en 16 horas. No es una predicción de ventas reales.
- Antes de superar ese alcance debe repetirse la prueba contra un entorno de staging idéntico a producción, incluyendo MySQL, autenticación y creación transaccional de ventas con datos descartables.

## Disponibilidad y conservación

- El sistema no elimina automáticamente ventas, pedidos, cierres de caja ni clientes: permanecen mientras la base de datos y la cuenta del proveedor existan.
- “Guardar datos durante un año” no equivale a garantizar disponibilidad durante un año.
- Una garantía formal requiere SLA contratado, monitoreo, restauración probada y copias externas.
- Política recomendada: copia diaria conservada 30 días y copia mensual conservada 12 meses.
- Sin almacenamiento externo configurado no se puede afirmar que existe una garantía de recuperación de un año.

## Cómo repetir

Desde `pos-backend`:

```powershell
npm run test:load -- http://127.0.0.1:8083/api/health 10 20
npm run test:load -- http://127.0.0.1:8083/api/productos 10 5
```

La prueba solo usa endpoints GET y no modifica inventario ni ventas.
