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

const T = {
  accent: '#ef4444',
  accentGlow: 'rgba(239, 68, 68, 0.4)',
  bg: '#0a0a0a',
  card: '#111111',
  border: '#262626',
  textMuted: '#a3a3a3',
  textDim: '#525252'
};

export default function App() {
  const [vista, setVista] = useState('status');
  const [empleados, setEmpleados] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionActual, setEvaluacionActual] = useState(null);
  const [nuevoEmpleado, setNuevoEmpleado] = useState('');
  const [semanaActual] = useState(Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000));
  const [tareaInput, setTareaInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalEmpleado, setModalEmpleado] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (!nuevoEmpleado.trim()) return;
    const { data } = await supabase.from('empleados').insert([{ nombre: nuevoEmpleado }]).select();
    if (data) { setEmpleados([...empleados, data[0]]); setNuevoEmpleado(''); }
  }

  async function eliminarEmpleado(id) {
    await supabase.from('empleados').delete().eq('id', id);
    await supabase.from('evaluaciones').delete().eq('empleado_id', id);
    setEmpleados(empleados.filter(e => e.id !== id));
    setEvaluaciones(evaluaciones.filter(e => e.empleado_id !== id));
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
    setEvaluacionActual(null); setVista('status');
  }

  function calcularPromedio(scores) {
    if (!scores) return null;
    const v = Object.values(scores).filter(x => x > 0);
    return v.length > 0 ? (v.reduce((a, b) => a + b, 0) / v.length) : null;
  }

  function getStatus(p) {
    if (p === null || p === undefined) return { label: 'Pendiente', color: '#525252', bg: '#52525220' };
    if (p >= 4) return { label: 'Excelente', color: '#10b981', bg: '#10b98120' };
    if (p >= 3) return { label: 'En meta', color: '#22c55e', bg: '#22c55e20' };
    if (p >= 2) return { label: 'Atención', color: '#f97316', bg: '#f9731620' };
    return { label: 'Crítico', color: '#ef4444', bg: '#ef444420' };
  }

  function iniciarEvaluacion(emp) {
    const existente = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
    setEvaluacionActual(existente ? { empleadoId: emp.id, empleadoNombre: emp.nombre, semana: semanaActual, scores: existente.scores || {}, tareas: existente.tareas || [], comentarios: existente.comentarios || '' } : { empleadoId: emp.id, empleadoNombre: emp.nombre, semana: semanaActual, scores: {}, tareas: [], comentarios: '' });
    setModalEmpleado(null);
    setVista('evaluar');
  }

  const promedioEquipo = () => {
    const evs = evaluaciones.filter(e => e.semana === semanaActual);
    if (evs.length === 0) return null;
    const proms = evs.map(e => calcularPromedio(e.scores)).filter(p => p !== null);
    return proms.length > 0 ? (proms.reduce((a, b) => a + b, 0) / proms.length) : null;
  };

  const evaluadosEstaSemana = evaluaciones.filter(e => e.semana === semanaActual).length;

  const getRanking = () => {
    return empleados.map(emp => {
      const ev = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
      const prom = ev ? calcularPromedio(ev.scores) : null;
      const tareas = ev?.tareas || [];
      const completadas = tareas.filter(t => t.completada).length;
      return { ...emp, promedio: prom, tareas: tareas.length, completadas, evaluado: !!ev };
    }).sort((a, b) => (b.promedio || 0) - (a.promedio || 0));
  };

  const getAlertas = () => {
    const alertas = [];
    empleados.forEach(emp => {
      const ev = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
      if (!ev) alertas.push({ tipo: 'warning', empleado: emp, mensaje: 'Sin evaluación esta semana' });
      else {
        const prom = calcularPromedio(ev.scores);
        if (prom !== null && prom < 3) alertas.push({ tipo: 'critical', empleado: emp, mensaje: `Rendimiento bajo (${prom.toFixed(1)})` });
        const pendientes = ev.tareas?.filter(t => !t.completada).length || 0;
        if (pendientes > 0) alertas.push({ tipo: 'task', empleado: emp, mensaje: `${pendientes} tarea${pendientes > 1 ? 's' : ''} pendiente${pendientes > 1 ? 's' : ''}` });
      }
    });
    return alertas.sort((a, b) => (a.tipo === 'critical' ? -1 : 1));
  };

  const getEvolucionSemanal = () => {
    const semanas = [];
    for (let i = 5; i >= 0; i--) {
      const sem = semanaActual - i;
      const evs = evaluaciones.filter(e => e.semana === sem);
      const proms = evs.map(e => calcularPromedio(e.scores)).filter(p => p !== null);
      const prom = proms.length > 0 ? proms.reduce((a, b) => a + b, 0) / proms.length : null;
      semanas.push({ semana: `S${sem}`, promedio: prom });
    }
    return semanas;
  };

  const getPromedioPorCriterio = () => {
    const evs = evaluaciones.filter(e => e.semana === semanaActual);
    return CRITERIOS.map(c => {
      const valores = evs.map(e => e.scores?.[c.id]).filter(v => v > 0);
      const prom = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
      return { criterio: c.icon, nombre: c.nombre, promedio: prom };
    });
  };

  const alertas = getAlertas();
  const ranking = getRanking();
  const pEquipo = promedioEquipo();
  const stEquipo = getStatus(pEquipo);

  const NAV = [
    { id: 'status', label: 'Status', icon: '◈' },
    { id: 'dashboard', label: 'Dashboard', icon: '◉' },
    { id: 'ranking', label: 'Ranking', icon: '△' },
    { id: 'alertas', label: 'Alertas', icon: '⚡', count: alertas.length },
    { id: 'equipo', label: 'Equipo', icon: '●' },
  ];

  if (loading) return (<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}><div className="text-center"><div className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl animate-pulse mx-auto" style={{ backgroundColor: T.accent, boxShadow: `0 0 30px ${T.accentGlow}` }}>D</div><p className="mt-4 text-white/50">Cargando...</p></div></div>);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: T.bg }}>
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)` }} />
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black" style={{ backgroundColor: T.accent, boxShadow: `0 0 15px ${T.accentGlow}` }}>D</div>
              <div><h1 className="text-lg font-bold leading-tight">DECODE<span style={{ color: T.accent }}>.AI</span></h1><p className="text-xs leading-tight" style={{ color: T.textDim }}>S{semanaActual}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {alertas.length > 0 && (<button onClick={() => setVista('alertas')} className="relative p-2 rounded-lg" style={{ backgroundColor: T.border }}><span>⚡</span><span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={{ backgroundColor: T.accent }}>{alertas.length}</span></button>)}
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg md:hidden" style={{ backgroundColor: T.border }}>☰</button>
            </div>
          </div>
          <nav className="hidden md:flex gap-1 mt-3 overflow-x-auto pb-1">
            {NAV.map(t => (<button key={t.id} onClick={() => setVista(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all" style={{ backgroundColor: vista === t.id ? T.accent : T.border, boxShadow: vista === t.id ? `0 0 10px ${T.accentGlow}` : 'none' }}><span>{t.icon}</span>{t.label}{t.count > 0 && <span className="px-1.5 rounded text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>{t.count}</span>}</button>))}
          </nav>
          {menuOpen && (<nav className="md:hidden flex flex-wrap gap-1 mt-3 pb-1">{NAV.map(t => (<button key={t.id} onClick={() => { setVista(t.id); setMenuOpen(false); }} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: vista === t.id ? T.accent : T.border }}><span>{t.icon}</span>{t.label}{t.count > 0 && <span className="px-1.5 rounded text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>{t.count}</span>}</button>))}</nav>)}
        </div>
      </header>

      <main className="p-4 pb-20">
        {vista === 'status' && (<div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-2xl font-mono font-bold" style={{ color: stEquipo.color }}>{pEquipo?.toFixed(1) || '--'}</p><p className="text-xs" style={{ color: T.textDim }}>Equipo</p></div>
            <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-2xl font-mono font-bold">{evaluadosEstaSemana}<span style={{ color: T.textDim }}>/{empleados.length}</span></p><p className="text-xs" style={{ color: T.textDim }}>Evaluados</p></div>
            <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-2xl font-mono font-bold" style={{ color: alertas.filter(a => a.tipo === 'critical').length > 0 ? '#ef4444' : T.textMuted }}>{alertas.length}</p><p className="text-xs" style={{ color: T.textDim }}>Alertas</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {empleados.map(emp => {
              const ev = evaluaciones.find(e => e.empleado_id === emp.id && e.semana === semanaActual);
              const prom = ev ? calcularPromedio(ev.scores) : null;
              const st = getStatus(prom);
              const tareas = ev?.tareas || [];
              const completadas = tareas.filter(t => t.completada).length;
              return (<div key={emp.id} onClick={() => setModalEmpleado(emp)} className="rounded-xl border p-4 cursor-pointer active:scale-[0.98] transition-all" style={{ backgroundColor: T.card, borderColor: prom !== null ? st.color + '40' : T.border }}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm border" style={{ backgroundColor: T.bg, borderColor: T.border }}>{emp.nombre.split(' ').map(n => n[0]).join('')}</div><div><h3 className="font-semibold text-sm">{emp.nombre}</h3><p className="text-xs" style={{ color: T.textDim }}>{ev ? '✓ Evaluado' : 'Pendiente'}</p></div></div>
                  <div className="text-right"><p className="text-2xl font-mono font-bold" style={{ color: st.color }}>{prom?.toFixed(1) || '--'}</p><span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span></div>
                </div>
                {ev && (<><div className="flex gap-1 mt-3">{CRITERIOS.map(c => { const s = ev.scores?.[c.id]; const col = s >= 4 ? '#10b981' : s >= 3 ? '#eab308' : s >= 2 ? '#f97316' : s > 0 ? '#ef4444' : T.border; return <div key={c.id} className="flex-1 h-7 rounded flex items-center justify-center text-xs font-mono font-bold" style={{ backgroundColor: col + '25', color: col }}>{s || '-'}</div>; })}</div>
                {tareas.length > 0 && (<div className="mt-3"><div className="flex justify-between text-xs mb-1"><span style={{ color: T.textDim }}>Tareas</span><span style={{ color: completadas === tareas.length ? '#10b981' : T.textMuted }}>{completadas}/{tareas.length}</span></div><div className="w-full h-1.5 rounded-full" style={{ backgroundColor: T.border }}><div className="h-1.5 rounded-full transition-all" style={{ width: `${(completadas / tareas.length) * 100}%`, backgroundColor: completadas === tareas.length ? '#10b981' : T.accent }} /></div></div>)}</>)}
              </div>);
            })}
          </div>
        </div>)}

        {vista === 'dashboard' && (<div className="space-y-4">
          <div className="rounded-xl border p-5 text-center relative overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: T.accentGlow }} />
            <p className="text-xs uppercase tracking-wider mb-1 relative" style={{ color: T.textDim }}>Promedio del equipo</p>
            <p className="text-5xl font-mono font-bold relative" style={{ color: stEquipo.color }}>{pEquipo?.toFixed(1) || '--'}</p>
            <p className="text-sm mt-1 relative" style={{ color: stEquipo.color }}>{stEquipo.label}</p>
            <div className="mt-3 relative"><div className="w-full h-2 rounded-full" style={{ backgroundColor: T.border }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, ((pEquipo || 0) / 5) * 100)}%`, backgroundColor: stEquipo.color }} /></div><div className="flex justify-between text-xs mt-1" style={{ color: T.textDim }}><span>0</span><span>Meta: 4.0</span><span>5</span></div></div>
          </div>
          <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <h3 className="font-medium text-sm mb-3">📈 Evolución semanal</h3>
            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={getEvolucionSemanal()}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="semana" tick={{ fill: T.textDim, fontSize: 11 }} /><YAxis domain={[0, 5]} tick={{ fill: T.textDim, fontSize: 11 }} /><Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} /><Line type="monotone" dataKey="promedio" stroke={T.accent} strokeWidth={2} dot={{ fill: T.accent, r: 4 }} connectNulls /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <h3 className="font-medium text-sm mb-3">📊 Por criterio</h3>
            <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={getPromedioPorCriterio()} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis type="number" domain={[0, 5]} tick={{ fill: T.textDim, fontSize: 11 }} /><YAxis type="category" dataKey="criterio" tick={{ fill: T.textDim, fontSize: 14 }} width={30} /><Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={(v) => v.toFixed(1)} /><Bar dataKey="promedio" fill={T.accent} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-xs" style={{ color: T.textDim }}>Evaluaciones totales</p><p className="text-3xl font-mono font-bold mt-1">{evaluaciones.length}</p></div>
            <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-xs" style={{ color: T.textDim }}>Tareas completadas</p><p className="text-3xl font-mono font-bold mt-1" style={{ color: '#10b981' }}>{evaluaciones.reduce((acc, e) => acc + (e.tareas?.filter(t => t.completada).length || 0), 0)}</p></div>
          </div>
        </div>)}

        {vista === 'ranking' && (<div className="space-y-3">
          <h2 className="text-lg font-bold">🏆 Ranking S{semanaActual}</h2>
          {ranking.map((emp, idx) => { const st = getStatus(emp.promedio); const medalla = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`; return (<div key={emp.id} className="rounded-xl border p-4 flex items-center gap-3" style={{ backgroundColor: T.card, borderColor: idx === 0 ? T.accent + '50' : T.border, boxShadow: idx === 0 ? `0 0 20px ${T.accentGlow}` : 'none' }}><div className="text-2xl w-10 text-center">{medalla}</div><div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border" style={{ backgroundColor: T.bg, borderColor: T.border }}>{emp.nombre.split(' ').map(n => n[0]).join('')}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{emp.nombre}</p><p className="text-xs" style={{ color: T.textDim }}>{emp.completadas}/{emp.tareas} tareas</p></div><div className="text-right"><p className="text-2xl font-mono font-bold" style={{ color: st.color }}>{emp.promedio?.toFixed(1) || '--'}</p></div></div>); })}
        </div>)}

        {vista === 'alertas' && (<div className="space-y-3">
          <h2 className="text-lg font-bold">⚡ Alertas</h2>
          {alertas.length === 0 ? (<div className="rounded-xl border p-8 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}><p className="text-3xl mb-2">✓</p><p className="font-medium">Todo en orden</p><p className="text-sm" style={{ color: T.textDim }}>No hay alertas pendientes</p></div>) : (alertas.map((a, i) => (<div key={i} className="rounded-xl border p-4 flex items-center justify-between" style={{ backgroundColor: T.card, borderColor: a.tipo === 'critical' ? '#ef4444' + '50' : a.tipo === 'warning' ? '#eab308' + '50' : T.border }}><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.tipo === 'critical' ? '#ef4444' + '20' : a.tipo === 'warning' ? '#eab308' + '20' : T.border }}>{a.tipo === 'critical' ? '🔴' : a.tipo === 'warning' ? '🟡' : '📋'}</div><div><p className="font-medium text-sm">{a.empleado.nombre}</p><p className="text-xs" style={{ color: T.textDim }}>{a.mensaje}</p></div></div><button onClick={() => iniciarEvaluacion(a.empleado)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: T.accent }}>{a.tipo === 'warning' ? 'Evaluar' : 'Ver'}</button></div>)))}
        </div>)}

        {vista === 'equipo' && (<div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <h3 className="font-medium text-sm mb-3">Agregar empleado</h3>
            <div className="flex gap-2"><input type="text" placeholder="Nombre completo" value={nuevoEmpleado} onChange={e => setNuevoEmpleado(e.target.value)} onKeyPress={e => e.key === 'Enter' && agregarEmpleado()} className="flex-1 rounded-lg px-3 py-2 text-sm border" style={{ backgroundColor: T.bg, borderColor: T.border, color: 'white' }} /><button onClick={agregarEmpleado} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.accent }}>+</button></div>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="p-3 border-b" style={{ borderColor: T.border }}><h3 className="font-medium text-sm">Equipo ({empleados.length})</h3></div>
            {empleados.map(emp => { const evs = evaluaciones.filter(e => e.empleado_id === emp.id); const proms = evs.map(e => calcularPromedio(e.scores)).filter(p => p !== null); const promGeneral = proms.length > 0 ? proms.reduce((a, b) => a + b, 0) / proms.length : null; const st = getStatus(promGeneral); return (<div key={emp.id} className="p-3 border-b flex items-center justify-between" style={{ borderColor: T.border }}><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border" style={{ backgroundColor: T.bg, borderColor: T.border }}>{emp.nombre.split(' ').map(n => n[0]).join('')}</div><div><p className="font-medium text-sm">{emp.nombre}</p><p className="text-xs" style={{ color: T.textDim }}>{evs.length} evaluaciones</p></div></div><div className="flex items-center gap-3"><span className="text-lg font-mono font-bold" style={{ color: st.color }}>{promGeneral?.toFixed(1) || '--'}</span><button onClick={() => eliminarEmpleado(emp.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10">🗑️</button></div></div>); })}
          </div>
        </div>)}

        {vista === 'evaluar' && evaluacionActual && (<div className="max-w-lg mx-auto">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="p-4 border-b" style={{ borderColor: T.border }}><h2 className="font-bold">{evaluacionActual.empleadoNombre}</h2><p className="text-xs" style={{ color: T.textDim }}>Semana {semanaActual}</p></div>
            <div className="p-4 space-y-5">
              <div className="rounded-xl p-3 border" style={{ backgroundColor: T.bg, borderColor: T.border }}>
                <label className="text-xs block mb-2" style={{ color: T.textDim }}>📋 TAREAS</label>
                <div className="flex gap-2 mb-2"><input type="text" value={tareaInput} onChange={e => setTareaInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter' && tareaInput.trim()) { setEvaluacionActual({ ...evaluacionActual, tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }] }); setTareaInput(''); } }} className="flex-1 rounded-lg px-3 py-2 text-sm border" style={{ backgroundColor: T.card, borderColor: T.border, color: 'white' }} placeholder="Nueva tarea..." /><button onClick={() => { if (tareaInput.trim()) { setEvaluacionActual({ ...evaluacionActual, tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }] }); setTareaInput(''); } }} className="px-3 py-2 rounded-lg" style={{ backgroundColor: T.accent }}>+</button></div>
                <div className="space-y-1 max-h-32 overflow-y-auto">{evaluacionActual.tareas.map((t, i) => (<div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ backgroundColor: T.card }}><button onClick={() => { const nt = [...evaluacionActual.tareas]; nt[i].completada = !nt[i].completada; setEvaluacionActual({ ...evaluacionActual, tareas: nt }); }} className="w-5 h-5 rounded border flex items-center justify-center text-xs" style={{ backgroundColor: t.completada ? '#10b981' : 'transparent', borderColor: t.completada ? '#10b981' : T.border }}>{t.completada && '✓'}</button><span className={`flex-1 text-sm ${t.completada ? 'line-through' : ''}`} style={{ color: t.completada ? T.textDim : 'white' }}>{t.texto}</span><button onClick={() => setEvaluacionActual({ ...evaluacionActual, tareas: evaluacionActual.tareas.filter((_, idx) => idx !== i) })} className="text-xs" style={{ color: T.textDim }}>✕</button></div>))}</div>
              </div>
              {CRITERIOS.map(c => (<div key={c.id}><label className="font-medium text-sm mb-2 block">{c.icon} {c.nombre}</label><div className="flex gap-1">{ESCALA.map(e => (<button key={e.valor} onClick={() => setEvaluacionActual({ ...evaluacionActual, scores: { ...evaluacionActual.scores, [c.id]: e.valor } })} className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all" style={{ backgroundColor: e.color, opacity: evaluacionActual.scores[c.id] === e.valor ? 1 : 0.35, transform: evaluacionActual.scores[c.id] === e.valor ? 'scale(1.05)' : 'scale(1)' }}>{e.valor}</button>))}</div></div>))}
              <div><label className="text-xs block mb-2" style={{ color: T.textDim }}>💬 FEEDBACK</label><textarea value={evaluacionActual.comentarios} onChange={e => setEvaluacionActual({ ...evaluacionActual, comentarios: e.target.value })} className="w-full rounded-lg p-3 text-sm border" style={{ backgroundColor: T.bg, borderColor: T.border, color: 'white' }} rows={2} placeholder="Comentarios..." /></div>
              <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: T.border }}><div><p className="text-xs" style={{ color: T.textDim }}>Promedio</p><p className="text-3xl font-mono font-bold" style={{ color: T.accent }}>{calcularPromedio(evaluacionActual.scores)?.toFixed(1) || '-'}</p></div><div className="flex gap-2"><button onClick={() => { setEvaluacionActual(null); setVista('status'); }} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: T.border }}>Cancelar</button><button onClick={guardarEvaluacion} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.accent, boxShadow: `0 0 15px ${T.accentGlow}` }}>Guardar</button></div></div>
            </div>
          </div>
        </div>)}
      </main>

      {modalEmpleado && (<div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setModalEmpleado(null)}>
        <div className="rounded-xl border w-full max-w-md max-h-[85vh] overflow-hidden" style={{ backgroundColor: T.card, borderColor: T.border }} onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold border" style={{ backgroundColor: T.bg, borderColor: T.border }}>{modalEmpleado.nombre.split(' ').map(n => n[0]).join('')}</div><div><h2 className="font-bold">{modalEmpleado.nombre}</h2><p className="text-xs" style={{ color: T.textDim }}>S{semanaActual}</p></div></div><button onClick={() => setModalEmpleado(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.border }}>✕</button></div>
          <div className="p-4 overflow-y-auto max-h-[60vh]">{(() => { const ev = evaluaciones.find(e => e.empleado_id === modalEmpleado.id && e.semana === semanaActual); const tareas = ev?.tareas || []; const completadas = tareas.filter(t => t.completada).length; const prom = ev ? calcularPromedio(ev.scores) : null; const st = getStatus(prom); return (<><div className="grid grid-cols-3 gap-2 mb-4"><div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.bg, borderColor: T.border }}><p className="text-2xl font-mono font-bold" style={{ color: T.accent }}>{completadas}/{tareas.length}</p><p className="text-xs" style={{ color: T.textDim }}>Tareas</p></div><div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.bg, borderColor: T.border }}><p className="text-2xl font-mono font-bold" style={{ color: tareas.length > 0 ? (completadas / tareas.length >= 0.8 ? '#10b981' : '#f97316') : T.textDim }}>{tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0}%</p><p className="text-xs" style={{ color: T.textDim }}>Done</p></div><div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.bg, borderColor: T.border }}><p className="text-2xl font-mono font-bold" style={{ color: st.color }}>{prom?.toFixed(1) || '--'}</p><p className="text-xs" style={{ color: T.textDim }}>Score</p></div></div>{tareas.length > 0 && (<div className="mb-4"><h3 className="text-xs mb-2" style={{ color: T.textDim }}>📋 TAREAS</h3><div className="space-y-1">{tareas.map((t, i) => (<div key={i} className="flex items-center gap-2 p-2 rounded-lg border" style={{ backgroundColor: t.completada ? '#10b981' + '10' : T.bg, borderColor: t.completada ? '#10b981' + '30' : T.border }}><span style={{ color: t.completada ? '#10b981' : T.textDim }}>{t.completada ? '✓' : '○'}</span><span className={`text-sm ${t.completada ? 'line-through' : ''}`} style={{ color: t.completada ? T.textDim : 'white' }}>{t.texto}</span></div>))}</div></div>)}{ev && (<div className="mb-4"><h3 className="text-xs mb-2" style={{ color: T.textDim }}>◉ SCORES</h3><div className="grid grid-cols-5 gap-1">{CRITERIOS.map(c => { const s = ev.scores?.[c.id]; const col = s >= 4 ? '#10b981' : s >= 3 ? '#eab308' : s >= 2 ? '#f97316' : s > 0 ? '#ef4444' : T.border; return (<div key={c.id} className="rounded-lg p-2 text-center border" style={{ backgroundColor: T.bg, borderColor: T.border }}><p className="text-lg font-mono font-bold" style={{ color: col }}>{s || '-'}</p><p className="text-xs">{c.icon}</p></div>); })}</div></div>)}{ev?.comentarios && (<div className="rounded-xl p-3 border" style={{ backgroundColor: T.bg, borderColor: T.border }}><p className="text-xs mb-1" style={{ color: T.textDim }}>💬 Feedback</p><p className="text-sm italic" style={{ color: T.textMuted }}>"{ev.comentarios}"</p></div>)}</>); })()}</div>
          <div className="p-4 border-t" style={{ borderColor: T.border }}><button onClick={() => iniciarEvaluacion(modalEmpleado)} className="w-full py-2.5 rounded-lg font-medium" style={{ backgroundColor: T.accent, boxShadow: `0 0 15px ${T.accentGlow}` }}>{evaluaciones.find(e => e.empleado_id === modalEmpleado.id && e.semana === semanaActual) ? 'Editar evaluación' : 'Evaluar ahora'}</button></div>
        </div>
      </div>)}

      <nav className="fixed bottom-0 left-0 right-0 border-t md:hidden" style={{ backgroundColor: T.card, borderColor: T.border }}><div className="flex justify-around py-2">{NAV.slice(0, 4).map(t => (<button key={t.id} onClick={() => setVista(t.id)} className="flex flex-col items-center py-1 px-3 rounded-lg" style={{ color: vista === t.id ? T.accent : T.textDim }}><span className="text-lg">{t.icon}</span><span className="text-xs">{t.label}</span></button>))}</div></nav>
    </div>
  );
}
