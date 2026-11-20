require('dotenv').config(); // Cargar variables de entorno
const db = require('./models'); // Importar el modelo

async function quickView() { // Función para ver la base de datos
  try {
    console.log('🔍 Vista Rápida de la Base de Datos\n'); 
    
    // Usuarios
    const users = await db.User.findAll({ attributes: ['id', 'nombre', 'correo', 'rol'] }); // Obtener todos los usuarios
    console.log('👥 Usuarios:');
    users.forEach(u => console.log(`   ID:${u.id} | ${u.nombre} | ${u.correo} | ${u.rol}`));
    
    // Empleados
    const employees = await db.Employee.findAll({ // Obtener todos los empleados
      include: [{ model: db.User, as: 'usuario', attributes: ['nombre'] }] 
    });
    console.log('\n👤 Empleados:');
    employees.forEach(e => console.log(`   ID:${e.id} | ${e.usuario.nombre} | ${e.posicion} | ${e.estado ? '✅' : '❌'}`));
    
    // Horarios
    const schedules = await db.Schedule.findAll({ // Obtener todos los horarios
      include: [{ model: db.Employee, as: 'empleado', include: [{ model: db.User, as: 'usuario', attributes: ['nombre'] }] }],
      limit: 10 
    });
    console.log('\n🕐 Horarios (últimos 10):');
    schedules.forEach(s => console.log(`   📅 ${s.fecha} | ⏰ ${s.hora_inicio}-${s.hora_fin} | 👤 ${s.empleado.usuario.nombre}`));
    
    // Solicitudes
    const requests = await db.ScheduleRequest.findAll({ // Obtener todas las solicitudes
      include: [{ model: db.Employee, as: 'empleado_solicitante', include: [{ model: db.User, as: 'usuario', attributes: ['nombre'] }] }],
      limit: 10 
    });
    console.log('\n📝 Solicitudes (últimas 10):');
    requests.forEach(r => console.log(`   📅 ${r.fecha_solicitada} | 🏷️ ${r.estado} | 👤 ${r.empleado_solicitante.usuario.nombre}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickView();
