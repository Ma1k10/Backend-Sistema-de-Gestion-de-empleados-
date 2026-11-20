/**
 * CONFIGURACIÓN DE EMAIL - MODO DEBUG
 * Archivo: backend/config/email_debug.js
 * Descripción: Versión de debugging del módulo de email.
 *              En lugar de enviar emails reales, imprime información en consola
 *              para facilitar el desarrollo y pruebas sin consumir cuotas de email.
 *
 * USO: Este archivo se puede usar temporalmente durante el desarrollo
 *      para evitar el envío de emails reales mientras se prueba el sistema.
 */

const sgMail = require('@sendgrid/mail');

// Configurar SendGrid con la API key (no se usa en modo debug)
sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'RUZMXWi1R_KIXfA-YAy8NQ');

/**
 * Simular envío de email de recuperación de contraseña (modo debug)
 * @param {string} adminEmail - Email del administrador
 * @param {string} employeeEmail - Email del empleado
 * @param {string} resetToken - Token de recuperación
 * @returns {boolean} Siempre retorna true (simula envío exitoso)
 *
 * En lugar de enviar un email real, imprime toda la información relevante
 * en la consola para debugging y desarrollo.
 */
const sendPasswordResetEmail = async (adminEmail, employeeEmail, resetToken) => {
  const now = new Date();
  const expiry = new Date(Date.now() + 3600000); // 1 hora de validez

  console.log('🔧 MODO DEBUG: SendGrid deshabilitado temporalmente');
  console.log('📧 Email del administrador:', adminEmail);
  console.log('👤 Email del empleado:', employeeEmail);
  console.log('🔑 Token de recuperación:', resetToken);
  console.log('⏰ Fecha de generación:', now.toISOString());
  console.log('⏳ Fecha de expiración:', expiry.toISOString());
  console.log('⏱️ Tiempo restante (ms):', expiry - now);
  console.log('⏱️ Tiempo restante (min):', (expiry - now) / (1000 * 60));

  // Simular envío exitoso para pruebas
  return true;
};

/**
 * Simular envío de confirmación de restablecimiento (modo debug)
 * @param {string} employeeEmail - Email del empleado
 * @returns {boolean} Siempre retorna true (simula envío exitoso)
 *
 * Imprime información de confirmación en consola en lugar de enviar email.
 */
const sendPasswordResetConfirmation = async (employeeEmail) => {
  console.log('🔧 MODO DEBUG: Confirmación de restablecimiento');
  console.log('👤 Email del empleado:', employeeEmail);
  console.log('✅ Contraseña restablecida exitosamente');
  console.log('🕐 Fecha de restablecimiento:', new Date().toISOString());

  // Simular envío exitoso para pruebas
  return true;
};

/**
 * Exportar funciones de debug
 * Estas funciones simulan el envío de emails imprimiendo información en consola
 */
module.exports = {
  sendPasswordResetEmail,           // Simular envío de solicitud de recuperación
  sendPasswordResetConfirmation     // Simular envío de confirmación
};
