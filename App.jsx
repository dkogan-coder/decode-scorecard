import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabase.js';

const CRITERIOS = [
  { id: 'entregas', nombre: 'Entregas', icon: '📦' },
  { id: 'calidad', nombre: 'Calidad', icon: '⭐' },
  { id: 'comunicacion', nombre: 'Comunicación', icon: '💬' },
  { id: 'iniciativa', nombre: 'Iniciativa', icon: '💡' },
  { id: 'puntualidad', nombre: 'Puntualidad', icon: '⏰' }
];

const ESCALA = [
  { valor: 1, color: '#ef4444' },
  { valor: 2, color: '#f97316' },
  { valor: 3, color: '#eab308' },
  { valor: 4, color: '#22c55e' },
  { valor: 5, color: '#10b981' }
];

const TECH = {
  accent: '#ef4444',
  accentGlow: 'rgba(239, 68, 68, 0.4)',
  bg: '#0a0a0a',
  card: '#111111',
  border: '#262626',
  textMuted: '#a3a3a3',
  textDim: '#525252'
};

export default function App() {
  const [vista, setVista] = useState('canvas');
  const [empleados, setEmpleados] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionActual, setEvaluacionActual] = useState(null);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '' });
  const [semanaActual] = useState(Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000));
  const [tareaInput, setTareaInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: emp } = await supabase.from('empleados').select('*').order('created_at');
    const { data: eva } = await supabase.from('evaluaciones').select('*').order('created_at');
    if (emp) setEmpleados(emp);
    if (eva) setEvaluaciones(eva.map(e => ({ ...e, scores: e.scores || {}, tareas: e.tareas || [] })));
    setLoading(false);
  }

  async function agregarEmpleado() {
    if (!nuevoEmpleado.nombre.trim()) return;
    const { data } = await supabase.from('empleados').insert([{ nombre: nuevoEmpleado.nombre }]).select();
    if (data) { setEmpleados([...empleados, data[0]]); setNuevoEmpleado({ nombre: '' }); }
  }

  async function guardarEvaluacion() {
    if (!evaluacionActual) return;
    const evalData = { empleado_id: evaluacionActual.empleadoId, empleado_nombre: evaluacionActual.empleadoNombre, semana: evaluacionActual.semana, scores: evaluacionActual.scores, tareas: evaluacionActual.tareas, comentarios: evaluacionActual.comentarios };
    const existente = evaluaciones.find(e => e.empleado_id === evaluacionActual.empleadoId && e.semana === evaluacionActual.semana);
    if (existente) {
      await supabase.from('evaluaciones').update(evalData).eq('id', existente.id);
      setEvaluaciones(evaluaciones.map(e => e.id === existente.id ? { ...e, ...evalData } : e));
    } else {
      const { data } = await supabase.from('evaluaciones').insert([evalData]).select();
      if (data) setEvaluaciones([...evaluaciones, { ...data[0], scores: data[0].scores || {}, tareas: data[0].tareas || [] }]);
    }
    setEvaluacionActual(null); setVista('canvas');
  }

  function calcularPromedio(scores) {
    if (!scores) return '-';
    const v = Object.values(scores).filter(x => x > 0);
    return v.length > 0 ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-';
  }

  function getStatus(p) {
    if (!p || p === '-') return { label: 'Sin datos', color: '#525252' };
    const n = parseFloat(p);
    if (n >= 4) return { label: 'Excelente', color: '#10b981' };
    if (n >= 3) return { label: 'En meta', color: '#22c55e' };
    if (n >= 2) return { label: 'Atención', color: '#f97316' };
    return { label: 'Crítico', color: '#ef4444' };
  }

  function iniciarEvaluacion(emp) {
    const existente = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
    setEvaluacionActual(existente ? { empleadoId: emp.id, empleadoNombre: emp.nombre, semana: semanaActual, scores: existente.scores || {}, tareas: existente.tareas || [], comentarios: existente.comentarios || '' } : { empleadoId: emp.id, empleadoNombre: emp.nombre, semana: semanaActual, scores: {}, tareas: [], comentarios: '' });
    setVista('evaluar');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: TECH.bg }}><div className="w-16 h-16 rounded-lg flex items-center justify-center font-black text-2xl animate-pulse" style={{ backgroundColor: TECH.accent }}>D</div></div>;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: TECH.bg }}>
      <header className="border-b px-6 py-4" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg" style={{ backgroundColor: TECH.accent }}>D</div>
            <div><h1 className="text-xl font-bold">DECODE<span style={{ color: TECH.accent }}>.AI</span></h1><p className="text-xs" style={{ color: TECH.textDim }}>Performance System</p></div>
          </div>
          <p className="text-sm font-mono" style={{ color: TECH.textDim }}>Semana {semanaActual}</p>
        </div>
        <nav className="flex gap-2 mt-4">
          {[{ id: 'canvas', label: 'STATUS' }, { id: 'equipo', label: 'EQUIPO' }].map(t => (
            <button key={t.id} onClick={() => setVista(t.id)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: vista === t.id ? TECH.accent : TECH.border }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main className="p-6">
        {vista === 'canvas' && (
          <div className="grid grid-cols-2 gap-4">
            {empleados.map(emp => {
              const ev = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
              const prom = ev ? calcularPromedio(ev.scores) : null;
              const st = getStatus(prom);
              return (
                <div key={emp.id} className="rounded-xl border p-5 cursor-pointer hover:scale-[1.02] transition" style={{ backgroundColor: TECH.card, borderColor: TECH.border }} onClick={() => iniciarEvaluacion(emp)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>{emp.nombre.split(' ').map(n => n[0]).join('')}</div>
                      <div><h3 className="font-semibold">{emp.nombre}</h3><p className="text-xs" style={{ color: TECH.textDim }}>{ev ? '✓ Evaluado' : 'Pendiente'}</p></div>
                    </div>
                    <div className="text-right"><p className="text-3xl font-mono font-bold" style={{ color: st.color }}>{prom || '--'}</p><span className="text-xs" style={{ color: st.color }}>{st.label}</span></div>
                  </div>
                  {ev && <div className="flex gap-1 mt-4">{CRITERIOS.map(c => { const s = ev.scores?.[c.id]; const col = s >= 4 ? '#10b981' : s >= 3 ? '#eab308' : s >= 2 ? '#f97316' : s > 0 ? '#ef4444' : TECH.border; return <div key={c.id} className="flex-1 h-8 rounded flex items-center justify-center text-xs font-mono font-bold" style={{ backgroundColor: col + '30', color: col }}>{s || '-'}</div>; })}</div>}
                </div>
              );
            })}
          </div>
        )}

        {vista === 'equipo' && (
          <div className="space-y-6">
            <div className="rounded-xl border p-5" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <h3 className="font-medium mb-4">AGREGAR EMPLEADO</h3>
              <div className="flex gap-3">
                <input type="text" placeholder="Nombre completo" value={nuevoEmpleado.nombre} onChange={e => setNuevoEmpleado({ nombre: e.target.value })} className="flex-1 rounded-lg px-4 py-2 border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border, color: 'white' }} />
                <button onClick={agregarEmpleado} className="px-5 py-2 rounded-lg font-medium" style={{ backgroundColor: TECH.accent }}>+ Agregar</button>
              </div>
            </div>
            <div className="rounded-xl border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              {empleados.map(emp => <div key={emp.id} className="p-4 border-b flex items-center justify-between" style={{ borderColor: TECH.border }}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>{emp.nombre.split(' ').map(n => n[0]).join('')}</div><p>{emp.nombre}</p></div></div>)}
            </div>
          </div>
        )}

        {vista === 'evaluar' && evaluacionActual && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <div className="p-5 border-b" style={{ borderColor: TECH.border }}><h2 className="text-xl font-bold">{evaluacionActual.empleadoNombre}</h2><p className="text-sm" style={{ color: TECH.textDim }}>Semana {semanaActual}</p></div>
              <div className="p-5 space-y-6">
                <div className="rounded-xl p-4 border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                  <label className="text-xs block mb-3" style={{ color: TECH.textDim }}>TAREAS</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={tareaInput} onChange={e => setTareaInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter' && tareaInput.trim()) { setEvaluacionActual({ ...evaluacionActual, tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }] }); setTareaInput(''); } }} className="flex-1 rounded-lg px-3 py-2 text-sm border" style={{ backgroundColor: TECH.card, borderColor: TECH.border, color: 'white' }} placeholder="Nueva tarea..." />
                    <button onClick={() => { if (tareaInput.trim()) { setEvaluacionActual({ ...evaluacionActual, tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }] }); setTareaInput(''); } }} className="px-4 py-2 rounded-lg" style={{ backgroundColor: TECH.accent }}>+</button>
                  </div>
                  {evaluacionActual.tareas.map((t, i) => <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 mb-2" style={{ backgroundColor: TECH.card }}><button onClick={() => { const nt = [...evaluacionActual.tareas]; nt[i].completada = !nt[i].completada; setEvaluacionActual({ ...evaluacionActual, tareas: nt }); }} className="w-5 h-5 rounded border flex items-center justify-center" style={{ backgroundColor: t.completada ? '#10b981' : 'transparent', borderColor: t.completada ? '#10b981' : TECH.border }}>{t.completada && '✓'}</button><span className={`flex-1 text-sm ${t.completada ? 'line-through' : ''}`} style={{ color: t.completada ? TECH.textDim : 'white' }}>{t.texto}</span></div>)}
                </div>
                {CRITERIOS.map(c => <div key={c.id}><label className="font-medium mb-2 block">{c.icon} {c.nombre}</label><div className="flex gap-2">{ESCALA.map(e => <button key={e.valor} onClick={() => setEvaluacionActual({ ...evaluacionActual, scores: { ...evaluacionActual.scores, [c.id]: e.valor } })} className="flex-1 py-3 rounded-lg font-bold" style={{ backgroundColor: e.color, opacity: evaluacionActual.scores[c.id] === e.valor ? 1 : 0.4 }}>{e.valor}</button>)}</div></div>)}
                <div><label className="text-xs block mb-2" style={{ color: TECH.textDim }}>FEEDBACK</label><textarea value={evaluacionActual.comentarios} onChange={e => setEvaluacionActual({ ...evaluacionActual, comentarios: e.target.value })} className="w-full rounded-lg p-3 border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border, color: 'white' }} rows={3} /></div>
                <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: TECH.border }}>
                  <p className="text-4xl font-mono font-bold" style={{ color: TECH.accent }}>{calcularPromedio(evaluacionActual.scores)}</p>
                  <div className="flex gap-3"><button onClick={() => { setEvaluacionActual(null); setVista('canvas'); }} className="px-5 py-2 rounded-lg" style={{ backgroundColor: TECH.border }}>Cancelar</button><button onClick={guardarEvaluacion} className="px-5 py-2 rounded-lg font-medium" style={{ backgroundColor: TECH.accent }}>Guardar</button></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
 
