import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  'https://kcmepfywnhozfilpdrfn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbWVwZnl3bmhvemZpbHBkcmZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDEwMzksImV4cCI6MjA4MDk3NzAzOX0.5CCUg17D1e6Q0uXfTpiZjWBy3AolgdOI6cctkibg4rE'
);

const resend = new Resend(process.env.RESEND_API_KEY);

function getSemanaActual() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - start) / 604800000);
}

export default async function handler(req, res) {
  try {
    const semana = getSemanaActual();
    const { data: empleados } = await supabase.from('empleados').select('*');
    const { data: evaluaciones } = await supabase.from('evaluaciones').select('*').eq('semana', semana);
    
    if (!empleados || empleados.length === 0) {
      return res.status(200).json({ message: 'No hay empleados' });
    }

    const emailsSent = [];

    for (const emp of empleados) {
      if (!emp.email) continue;

      const ev = evaluaciones?.find(e => e.empleado_id === emp.id);
      const tareasPendientes = ev?.tareas?.filter(t => !t.completada) || [];
      
      let contenidoPersonal = '';
      if (!ev) {
        contenidoPersonal = '<p style="color: #eab308;">⚠️ Aún no has sido evaluado esta semana.</p>';
      } else if (tareasPendientes.length > 0) {
        contenidoPersonal = '<p><strong>📋 Tienes ' + tareasPendientes.length + ' tarea' + (tareasPendientes.length > 1 ? 's' : '') + ' pendiente' + (tareasPendientes.length > 1 ? 's' : '') + ':</strong></p><ul style="color: #a3a3a3;">' + tareasPendientes.map(t => '<li>' + t.texto + '</li>').join('') + '</ul>';
      } else {
        contenidoPersonal = '<p style="color: #10b981;">✓ ¡Todas tus tareas están completadas!</p>';
      }

      let contenidoEquipo = '';
      if (emp.is_admin) {
        const sinEvaluar = empleados.filter(e => !evaluaciones?.find(ev => ev.empleado_id === e.id));
        const conTareas = empleados.filter(e => { const ev = evaluaciones?.find(ev => ev.empleado_id === e.id); return ev?.tareas?.some(t => !t.completada); });
        contenidoEquipo = '<hr style="border-color: #262626; margin: 20px 0;"><h3 style="color: #ef4444;">📊 Status del Equipo</h3><p><strong>Evaluados:</strong> ' + (evaluaciones?.length || 0) + '/' + empleados.length + '</p>' + (sinEvaluar.length > 0 ? '<p style="color: #eab308;">⚠️ Sin evaluar: ' + sinEvaluar.map(e => e.nombre.split(' ')[0]).join(', ') + '</p>' : '') + (conTareas.length > 0 ? '<p style="color: #f97316;">📋 Con tareas pendientes: ' + conTareas.map(e => e.nombre.split(' ')[0]).join(', ') + '</p>' : '');
      }

      const html = '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: white; padding: 20px; border-radius: 12px;"><div style="text-align: center; margin-bottom: 20px;"><div style="display: inline-block; background: #ef4444; color: white; font-weight: bold; padding: 10px 15px; border-radius: 8px; font-size: 18px;">D</div><h2 style="margin: 10px 0 5px;">Buenos días, ' + emp.nombre.split(' ')[0] + '! ☀️</h2><p style="color: #525252; margin: 0;">Semana ' + semana + ' • DECODE.AI</p></div>' + contenidoPersonal + contenidoEquipo + '<div style="text-align: center; margin-top: 20px;"><a href="https://decode-scorecard.vercel.app" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Abrir Scorecard</a></div></div>';

      await resend.emails.send({
        from: 'DECODE.AI <notificaciones@decodeai.io>',
        to: emp.email,
        subject: '☀️ Buenos días ' + emp.nombre.split(' ')[0] + ' - S' + semana,
        html: html
      });

      emailsSent.push(emp.email);
    }

    return res.status(200).json({ success: true, emailsSent });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
