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

function calcularPromedio(scores) {
  if (!scores) return null;
  const v = Object.values(scores).filter(x => x > 0);
  return v.length > 0 ? (v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export default async function handler(req, res) {
  try {
    const semana = getSemanaActual();
    const { data: empleados } = await supabase.from('empleados').select('*');
    const { data: evaluaciones } = await supabase.from('evaluaciones').select('*').eq('semana', semana);
    
    if (!empleados || empleados.length === 0) {
      return res.status(200).json({ message: 'No hay empleados' });
    }

    const promedios = evaluaciones?.map(e => calcularPromedio(e.scores)).filter(p => p !== null) || [];
    const promedioEquipo = promedios.length > 0 ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1) : '--';
    const tareasTotal = evaluaciones?.reduce((acc, e) => acc + (e.tareas?.length || 0), 0) || 0;
    const tareasCompletadas = evaluaciones?.reduce((acc, e) => acc + (e.tareas?.filter(t => t.completada).length || 0), 0) || 0;

    const emailsSent = [];

    for (const emp of empleados) {
      if (!emp.email) continue;

      const ev = evaluaciones?.find(e => e.empleado_id === emp.id);
      const prom = ev ? calcularPromedio(ev.scores) : null;
      const tareas = ev?.tareas || [];
      const completadas = tareas.filter(t => t.completada).length;
      
      let contenidoPersonal = '';
      if (!ev) {
        contenidoPersonal = '<p style="color: #eab308;">⚠️ Aún no has sido evaluado esta semana.</p>';
      } else {
        const promColor = prom >= 4 ? '#10b981' : prom >= 3 ? '#22c55e' : prom >= 2 ? '#f97316' : '#ef4444';
        contenidoPersonal = '<div style="display: flex; gap: 10px; margin-bottom: 15px;"><div style="flex: 1; background: #111; padding: 15px; border-radius: 8px; text-align: center;"><p style="font-size: 24px; font-weight: bold; color: ' + promColor + '; margin: 0;">' + (prom ? prom.toFixed(1) : '--') + '</p><p style="color: #525252; font-size: 12px; margin: 5px 0 0;">Tu score</p></div><div style="flex: 1; background: #111; padding: 15px; border-radius: 8px; text-align: center;"><p style="font-size: 24px; font-weight: bold; color: ' + (completadas === tareas.length ? '#10b981' : '#f97316') + '; margin: 0;">' + completadas + '/' + tareas.length + '</p><p style="color: #525252; font-size: 12px; margin: 5px 0 0;">Tareas</p></div></div>';
      }

      let contenidoEquipo = '';
      if (emp.is_admin) {
        const ranking = empleados.map(e => { const ev = evaluaciones?.find(ev => ev.empleado_id === e.id); return { nombre: e.nombre, prom: ev ? calcularPromedio(ev.scores) : null }; }).sort((a, b) => (b.prom || 0) - (a.prom || 0));
        const alertas = empleados.filter(e => { const ev = evaluaciones?.find(ev => ev.empleado_id === e.id); const p = ev ? calcularPromedio(ev.scores) : null; return p !== null && p < 3; });

        contenidoEquipo = '<hr style="border-color: #262626; margin: 20px 0;"><h3 style="color: #ef4444;">📊 Resumen del Equipo</h3><div style="display: flex; gap: 10px; margin-bottom: 15px;"><div style="flex: 1; background: #111; padding: 15px; border-radius: 8px; text-align: center;"><p style="font-size: 24px; font-weight: bold; color: #ef4444; margin: 0;">' + promedioEquipo + '</p><p style="color: #525252; font-size: 12px; margin: 5px 0 0;">Promedio</p></div><div style="flex: 1; background: #111; padding: 15px; border-radius: 8px; text-align: center;"><p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 0;">' + tareasCompletadas + '/' + tareasTotal + '</p><p style="color: #525252; font-size: 12px; margin: 5px 0 0;">Tareas</p></div></div><p><strong>🏆 Ranking:</strong></p><ol style="color: #a3a3a3; padding-left: 20px;">' + ranking.map(r => '<li>' + r.nombre.split(' ')[0] + ': <strong style="color: ' + (r.prom >= 4 ? '#10b981' : r.prom >= 3 ? '#22c55e' : '#f97316') + '">' + (r.prom ? r.prom.toFixed(1) : '--') + '</strong></li>').join('') + '</ol>' + (alertas.length > 0 ? '<p style="color: #ef4444;">⚠️ Requieren atención: ' + alertas.map(a => a.nombre.split(' ')[0]).join(', ') + '</p>' : '<p style="color: #10b981;">✓ Todo el equipo en buen rendimiento</p>');
      }

      const html = '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: white; padding: 20px; border-radius: 12px;"><div style="text-align: center; margin-bottom: 20px;"><div style="display: inline-block; background: #ef4444; color: white; font-weight: bold; padding: 10px 15px; border-radius: 8px; font-size: 18px;">D</div><h2 style="margin: 10px 0 5px;">Resumen del día, ' + emp.nombre.split(' ')[0] + ' 🌙</h2><p style="color: #525252; margin: 0;">Semana ' + semana + ' • DECODE.AI</p></div>' + contenidoPersonal + contenidoEquipo + '<div style="text-align: center; margin-top: 20px;"><a href="https://decode-scorecard.vercel.app" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver Dashboard</a></div></div>';

      await resend.emails.send({
        from: 'DECODE.AI <notificaciones@decodeai.io>',
        to: emp.email,
        subject: '🌙 Resumen del día ' + emp.nombre.split(' ')[0] + ' - S' + semana,
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
