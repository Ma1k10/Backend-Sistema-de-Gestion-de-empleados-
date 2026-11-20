const mysql = require('mysql2/promise'); // Importar mysql2

const testConnection = async () => {
  console.log('🧪 Probando conexión directa con MySQL...'); 
  
  // Probar con la URL que sabemos que funciona (para debugging) el proceso de buscar, identificar, aislar y corregir errores o fallos
  const testUrls = [
    'mysql://root:KDggZBaheZWoxgxneLDqqtoaxAvzcawX@turntable.proxy.rlwy.net:27838/railway',
    'mysql://root:KDggZBaheZWoxgxneLDqqtoaxAvzcawX@localhost:3306/railway'
  ];
  // Iterar sobre las URLs de prueba recorrer una lista de direcciones web (URLs) de un entorno de desarrollo o pruebas (testing / staging) una por una
  for (const url of testUrls) {
    try {
      console.log(`🔍 Probando URL: ${url.replace(/\/\/.*@/, '//***:***@')}`);
      // Parsear la URL analizar una cadena de texto que representa una dirección web para dividirla y extraer sus partes
      const parsed = new URL(url);
      const connection = await mysql.createConnection({
        host: parsed.hostname,
        port: parsed.port || 3306,
        user: parsed.username,
        password: parsed.password,
        database: parsed.pathname.substring(1)
      });
      // Hacer un ping para verificar la conexión
      await connection.ping();
      console.log('✅ Conexión exitosa con:', url.replace(/\/\/.*@/, '//***:***@'));
      await connection.end();
      return url;
      // Retornar la URL exitosa
    } catch (error) {
      console.log(`❌ Falló conexión con ${url.replace(/\/\/.*@/, '//***:***@')}: ${error.message}`); // Mostrar el mensaje de error
      console.log(`   Código: ${error.code}`); // Mostrar el código de error
      console.log(`   Errno: ${error.errno}`); // Mostrar el número de error
      console.log(`   SQL State: ${error.sqlState}`); // Mostrar el estado SQL
    }
  }
  // Si ninguna URL funciona, lanzar un error
  throw new Error('No se pudo conectar con ninguna URL');
};

module.exports = { testConnection };
