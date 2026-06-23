describe('aislamiento de base de datos por entorno', () => {
  let validateDatabaseIsolation;

  beforeAll(() => {
    ({ validateDatabaseIsolation } = require('./env'));
  });

  test('bloquea TiDB/remoto durante desarrollo local', () => {
    expect(() => validateDatabaseIsolation({
      host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
      hosted: false,
      allowRemoteDevelopment: false
    })).toThrow('entorno local no puede usar una base remota');
  });

  test('bloquea localhost en un despliegue', () => {
    expect(() => validateDatabaseIsolation({
      host: 'localhost',
      hosted: true,
      allowRemoteDevelopment: false
    })).toThrow('despliegue no puede conectarse a una base de datos local');
  });

  test('acepta MySQL local en desarrollo y TiDB en hosting', () => {
    expect(() => validateDatabaseIsolation({
      host: 'localhost', hosted: false, allowRemoteDevelopment: false
    })).not.toThrow();
    expect(() => validateDatabaseIsolation({
      host: 'gateway01.us-east-1.prod.aws.tidbcloud.com', hosted: true, allowRemoteDevelopment: false
    })).not.toThrow();
  });
});
