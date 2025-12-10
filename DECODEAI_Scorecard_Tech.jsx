import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CRITERIOS = [
  { id: 'entregas', nombre: 'Entregas', desc: 'Cumplimiento de tareas en tiempo', icon: '📦' },
  { id: 'calidad', nombre: 'Calidad', desc: 'Nivel de calidad del trabajo', icon: '⭐' },
  { id: 'comunicacion', nombre: 'Comunicación', desc: 'Claridad y proactividad', icon: '💬' },
  { id: 'iniciativa', nombre: 'Iniciativa', desc: 'Propone soluciones y mejoras', icon: '💡' },
  { id: 'puntualidad', nombre: 'Puntualidad', desc: 'Asistencia y disponibilidad', icon: '⏰' }
];

const EMPLEADOS_INICIAL = [
  { id: 1, nombre: 'Daniel Kogan' },
  { id: 2, nombre: 'Dan Deray' },
  { id: 3, nombre: 'Haim Attias' },
  { id: 4, nombre: 'Elias Sherem' }
];

const ESCALA = [
  { valor: 1, label: 'Muy bajo', color: '#ef4444', desc: 'No cumple expectativas' },
  { valor: 2, label: 'Bajo', color: '#f97316', desc: 'Cumple parcialmente' },
  { valor: 3, label: 'Aceptable', color: '#eab308', desc: 'Cumple expectativas básicas' },
  { valor: 4, label: 'Bueno', color: '#22c55e', desc: 'Supera expectativas' },
  { valor: 5, label: 'Excelente', color: '#10b981', desc: 'Desempeño excepcional' }
];

// Colores tech
const TECH = {
  accent: '#ef4444',
  accentLight: '#f87171',
  accentDark: '#dc2626',
  accentGlow: 'rgba(239, 68, 68, 0.4)',
  bg: '#0a0a0a',
  card: '#111111',
  cardHover: '#1a1a1a',
  border: '#262626',
  borderLight: '#333333',
  text: '#ffffff',
  textMuted: '#a3a3a3',
  textDim: '#525252'
};

export default function ScoreCardApp() {
  const [vista, setVista] = useState('canvas');
  const [empleados, setEmpleados] = useState(EMPLEADOS_INICIAL);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionActual, setEvaluacionActual] = useState(null);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '' });
  const [semanaActual, setSemanaActual] = useState(getNumeroSemana());
  const [tareaInput, setTareaInput] = useState('');
  const [modalTareas, setModalTareas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [metaEquipo, setMetaEquipo] = useState(4.0);
  const [showConfig, setShowConfig] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState('todas');

  function getNumeroSemana() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  }

  function getFechaViernes() {
    const now = new Date();
    const day = now.getDay();
    const diff = 5 - day;
    const viernes = new Date(now);
    viernes.setDate(now.getDate() + diff);
    return viernes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getHoy() {
    return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function calcularPromedio(scores) {
    const valores = Object.values(scores).filter(v => v > 0);
    return valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1) : '-';
  }

  function getPromedioEmpleado(empleadoId) {
    const evals = evaluaciones.filter(e => e.empleadoId === empleadoId);
    if (evals.length === 0) return null;
    const promedios = evals.map(e => parseFloat(calcularPromedio(e.scores))).filter(p => !isNaN(p));
    return promedios.length > 0 ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1) : null;
  }

  function getStatus(promedio) {
    if (!promedio || promedio === '-') return { label: 'Sin datos', color: '#525252', icon: '○' };
    const p = parseFloat(promedio);
    if (p >= 4) return { label: 'Excelente', color: '#10b981', icon: '◆' };
    if (p >= 3) return { label: 'En meta', color: '#22c55e', icon: '▲' };
    if (p >= 2) return { label: 'Atención', color: '#f97316', icon: '●' };
    return { label: 'Crítico', color: '#ef4444', icon: '■' };
  }

  function iniciarEvaluacion(empleado) {
    const existente = evaluaciones.find(e => e.empleadoId === empleado.id && e.semana === semanaActual);
    if (existente) {
      setEvaluacionActual({ ...existente });
    } else {
      setEvaluacionActual({
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        semana: semanaActual,
        fecha: new Date().toISOString(),
        scores: { entregas: 0, calidad: 0, comunicacion: 0, iniciativa: 0, puntualidad: 0 },
        tareas: [],
        comentarios: ''
      });
    }
    setTareaInput('');
    setVista('evaluar');
  }

  function guardarEvaluacion() {
    if (!evaluacionActual) return;
    const existente = evaluaciones.findIndex(
      e => e.empleadoId === evaluacionActual.empleadoId && e.semana === evaluacionActual.semana
    );
    let nuevasEvals;
    if (existente >= 0) {
      nuevasEvals = [...evaluaciones];
      nuevasEvals[existente] = evaluacionActual;
    } else {
      nuevasEvals = [...evaluaciones, evaluacionActual];
    }
    setEvaluaciones(nuevasEvals);
    generarAlertas(nuevasEvals);
    setEvaluacionActual(null);
    setVista('canvas');
  }

  function agregarEmpleado() {
    if (!nuevoEmpleado.nombre.trim()) return;
    setEmpleados([...empleados, { id: Date.now(), nombre: nuevoEmpleado.nombre }]);
    setNuevoEmpleado({ nombre: '' });
  }

  function eliminarEmpleado(id) {
    setEmpleados(empleados.filter(e => e.id !== id));
    setEvaluaciones(evaluaciones.filter(e => e.empleadoId !== id));
  }

  function getHistorialEmpleado(empleadoId) {
    return evaluaciones
      .filter(e => e.empleadoId === empleadoId)
      .sort((a, b) => a.semana - b.semana)
      .map(e => ({
        semana: `S${e.semana}`,
        promedio: parseFloat(calcularPromedio(e.scores)),
        ...e.scores
      }));
  }

  function generarAlertas(evals = evaluaciones) {
    const nuevasAlertas = [];
    
    empleados.forEach(emp => {
      const evalSemana = evals.find(e => e.empleadoId === emp.id && e.semana === semanaActual);
      const promedio = getPromedioEmpleado(emp.id);
      
      if (!evalSemana) {
        nuevasAlertas.push({
          id: `sin-eval-${emp.id}`, tipo: 'warning', empleado: emp.nombre,
          empleadoId: emp.id, mensaje: 'Sin evaluación esta semana', accion: 'Evaluar', prioridad: 2
        });
      }
      
      if (evalSemana) {
        const pendientes = evalSemana.tareas?.filter(t => !t.completada).length || 0;
        if (pendientes > 0) {
          nuevasAlertas.push({
            id: `tareas-${emp.id}`, tipo: 'task', empleado: emp.nombre,
            empleadoId: emp.id, mensaje: `${pendientes} tarea${pendientes > 1 ? 's' : ''} pendiente${pendientes > 1 ? 's' : ''}`,
            accion: 'Ver', prioridad: 1
          });
        }
      }
      
      if (promedio && parseFloat(promedio) < 3) {
        nuevasAlertas.push({
          id: `bajo-${emp.id}`, tipo: 'critical', empleado: emp.nombre,
          empleadoId: emp.id, mensaje: `Rendimiento bajo (${promedio})`, accion: 'Revisar', prioridad: 3
        });
      }
      
      const evalAnterior = evals.find(e => e.empleadoId === emp.id && e.semana === semanaActual - 1);
      if (evalSemana && evalAnterior) {
        const promActual = parseFloat(calcularPromedio(evalSemana.scores));
        const promAnterior = parseFloat(calcularPromedio(evalAnterior.scores));
        if (promActual < promAnterior - 0.5) {
          nuevasAlertas.push({
            id: `bajada-${emp.id}`, tipo: 'decline', empleado: emp.nombre,
            empleadoId: emp.id, mensaje: `Bajó ${(promAnterior - promActual).toFixed(1)} pts`, accion: 'Analizar', prioridad: 2
          });
        }
      }
    });
    
    setAlertas(nuevasAlertas.sort((a, b) => b.prioridad - a.prioridad));
  }

  useEffect(() => { generarAlertas(); }, [evaluaciones, empleados, semanaActual]);

  function exportarDatos() {
    const data = { exportDate: new Date().toISOString(), semana: semanaActual, empleados, evaluaciones };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard-decode-S${semanaActual}.json`;
    a.click();
  }

  const promedioEquipo = () => {
    const evalsSemanales = evaluaciones.filter(e => e.semana === semanaActual);
    if (evalsSemanales.length === 0) return '-';
    const promedios = evalsSemanales.map(e => parseFloat(calcularPromedio(e.scores))).filter(p => !isNaN(p));
    return promedios.length > 0 ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1) : '-';
  };

  const getRanking = () => {
    return empleados
      .map(emp => {
        const evalSemana = evaluaciones.find(e => e.empleadoId === emp.id && e.semana === semanaActual);
        const promedio = evalSemana ? parseFloat(calcularPromedio(evalSemana.scores)) : 0;
        const tareas = evalSemana?.tareas || [];
        const cumplimiento = tareas.length > 0 ? (tareas.filter(t => t.completada).length / tareas.length) * 100 : 0;
        return { ...emp, promedio, cumplimiento, evaluado: !!evalSemana };
      })
      .sort((a, b) => b.promedio - a.promedio);
  };

  const alertasFiltradas = filtroAlerta === 'todas' ? alertas : alertas.filter(a => a.tipo === filtroAlerta);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: TECH.bg }}>
      {/* Header con línea tech */}
      <header className="relative border-b" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
        {/* Línea de acento tech */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${TECH.accent}, transparent)` }}></div>
        
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo tech */}
              <div className="relative">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
                  style={{ backgroundColor: TECH.accent, boxShadow: `0 0 20px ${TECH.accentGlow}` }}>
                  D
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: TECH.accent }}></div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">DECODE<span style={{ color: TECH.accent }}>.AI</span></h1>
                <p className="text-xs tracking-widest uppercase" style={{ color: TECH.textDim }}>Performance System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm" style={{ color: TECH.textMuted }}>{getHoy()}</p>
                <p className="text-xs font-mono" style={{ color: TECH.textDim }}>S{semanaActual} // {getFechaViernes()}</p>
              </div>
              
              {alertas.length > 0 && (
                <button onClick={() => setVista('alertas')}
                  className="relative p-2 rounded-lg transition-all hover:scale-105"
                  style={{ backgroundColor: TECH.border }}>
                  <span className="text-lg">⚡</span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: TECH.accent, boxShadow: `0 0 10px ${TECH.accentGlow}` }}>
                    {alertas.length}
                  </span>
                </button>
              )}
              
              <button onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-lg transition-all hover:scale-105" style={{ backgroundColor: TECH.border }}>
                ⚙️
              </button>
              
              <button onClick={exportarDatos}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{ backgroundColor: TECH.accent, boxShadow: `0 0 15px ${TECH.accentGlow}` }}>
                ↓ Export
              </button>
            </div>
          </div>
          
          {showConfig && (
            <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
              <div className="flex items-center gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: TECH.textDim }}>Meta del equipo</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="range" min="1" max="5" step="0.5" value={metaEquipo}
                      onChange={e => setMetaEquipo(parseFloat(e.target.value))} className="w-32 accent-red-500" />
                    <span className="text-xl font-mono font-bold" style={{ color: TECH.accent }}>{metaEquipo}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Nav tech */}
          <nav className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {[
              { id: 'canvas', label: 'STATUS', icon: '◈' },
              { id: 'alertas', label: 'ALERTAS', icon: '⚡', count: alertas.length },
              { id: 'tareas', label: 'TAREAS', icon: '☰' },
              { id: 'ranking', label: 'RANKING', icon: '△' },
              { id: 'dashboard', label: 'METRICS', icon: '◉' },
              { id: 'equipo', label: 'EQUIPO', icon: '●', count: empleados.length },
              { id: 'historial', label: 'LOG', icon: '≡' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setVista(tab.id)}
                className="px-4 py-2 rounded-lg text-xs font-medium tracking-wider transition-all flex items-center gap-2 whitespace-nowrap"
                style={{
                  backgroundColor: vista === tab.id ? TECH.accent : TECH.border,
                  color: vista === tab.id ? 'white' : TECH.textMuted,
                  boxShadow: vista === tab.id ? `0 0 15px ${TECH.accentGlow}` : 'none'
                }}>
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: vista === tab.id ? 'rgba(0,0,0,0.3)' : TECH.bg }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="p-6">
        {/* STATUS BOARD */}
        {vista === 'canvas' && (
          <div className="space-y-6">
            {/* Stats principales */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl p-5 border relative overflow-hidden"
                style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl" style={{ backgroundColor: TECH.accentGlow }}></div>
                <p className="text-xs uppercase tracking-wider relative" style={{ color: TECH.textDim }}>Promedio</p>
                <p className="text-4xl font-mono font-bold mt-1 relative" style={{ color: TECH.accent }}>{promedioEquipo()}</p>
              </div>
              <div className="rounded-xl p-5 border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: TECH.textDim }}>Meta</p>
                <p className="text-4xl font-mono font-bold mt-1">{metaEquipo}</p>
              </div>
              <div className="rounded-xl p-5 border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: TECH.textDim }}>Evaluados</p>
                <p className="text-4xl font-mono font-bold mt-1">
                  {evaluaciones.filter(e => e.semana === semanaActual).length}<span style={{ color: TECH.textDim }}>/{empleados.length}</span>
                </p>
              </div>
              <div className="rounded-xl p-5 border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: TECH.textDim }}>Alertas</p>
                <p className="text-4xl font-mono font-bold mt-1" style={{ color: alertas.length > 0 ? '#f97316' : TECH.textMuted }}>
                  {alertas.length}
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="rounded-xl p-5 border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase tracking-wider" style={{ color: TECH.textDim }}>Progreso hacia meta</span>
                <span className="font-mono text-sm" style={{ color: TECH.accent }}>
                  {Math.min(100, Math.round((parseFloat(promedioEquipo()) / metaEquipo) * 100)) || 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: TECH.border }}>
                <div className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (parseFloat(promedioEquipo()) / metaEquipo) * 100) || 0}%`,
                    backgroundColor: TECH.accent,
                    boxShadow: `0 0 10px ${TECH.accentGlow}`
                  }}></div>
              </div>
            </div>

            {/* Alertas rápidas */}
            {alertas.filter(a => a.tipo === 'critical' || a.tipo === 'task').length > 0 && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm" style={{ color: TECH.accent }}>⚡ REQUIERE ATENCIÓN</h3>
                  <button onClick={() => setVista('alertas')} className="text-xs hover:underline" style={{ color: TECH.accent }}>Ver todas →</button>
                </div>
                <div className="space-y-2">
                  {alertas.filter(a => a.tipo === 'critical' || a.tipo === 'task').slice(0, 3).map(alerta => (
                    <div key={alerta.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: TECH.bg }}>
                      <div className="flex items-center gap-3">
                        <span>{alerta.tipo === 'critical' ? '■' : '●'}</span>
                        <div>
                          <p className="text-sm font-medium">{alerta.empleado}</p>
                          <p className="text-xs" style={{ color: TECH.textDim }}>{alerta.mensaje}</p>
                        </div>
                      </div>
                      <button onClick={() => { const emp = empleados.find(e => e.id === alerta.empleadoId); if (emp) setModalTareas(emp); }}
                        className="px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: TECH.accent }}>
                        {alerta.accion}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de empleados */}
            <div className="grid grid-cols-2 gap-4">
              {empleados.map(emp => {
                const evalSemana = evaluaciones.find(e => e.empleadoId === emp.id && e.semana === semanaActual);
                const promedio = evalSemana ? calcularPromedio(evalSemana.scores) : null;
                const promedioNum = promedio ? parseFloat(promedio) : 0;
                const status = getStatus(promedio);
                const historial = getHistorialEmpleado(emp.id);
                const tareasCompletadas = evalSemana?.tareas?.filter(t => t.completada).length || 0;
                const totalTareas = evalSemana?.tareas?.length || 0;
                const cumplimiento = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

                return (
                  <div key={emp.id} onClick={() => setModalTareas(emp)}
                    className="rounded-xl border cursor-pointer transition-all hover:scale-[1.02] group relative overflow-hidden"
                    style={{ backgroundColor: TECH.card, borderColor: promedio ? status.color + '40' : TECH.border }}>
                    {/* Glow en hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: `radial-gradient(circle at 50% 0%, ${TECH.accentGlow}, transparent 70%)` }}></div>
                    
                    <div className="p-5 relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border"
                            style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                            {emp.nombre.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold group-hover:text-red-400 transition">{emp.nombre}</h3>
                            <p className="text-xs font-mono" style={{ color: TECH.textDim }}>
                              {evalSemana ? `S${semanaActual} ✓` : 'PENDING'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-mono font-bold" style={{ color: status.color }}>{promedio || '--'}</p>
                          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: status.color + '20', color: status.color }}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </div>

                      {evalSemana && (
                        <>
                          {/* Scores */}
                          <div className="flex gap-1 mt-4">
                            {CRITERIOS.map(c => {
                              const score = evalSemana.scores[c.id];
                              const scoreColor = score >= 4 ? '#10b981' : score >= 3 ? '#eab308' : score >= 2 ? '#f97316' : score > 0 ? '#ef4444' : TECH.border;
                              return (
                                <div key={c.id} className="flex-1 h-8 rounded flex items-center justify-center text-xs font-mono font-bold"
                                  style={{ backgroundColor: scoreColor + '30', color: scoreColor }} title={c.nombre}>
                                  {score || '-'}
                                </div>
                              );
                            })}
                          </div>

                          {/* Tareas */}
                          {totalTareas > 0 && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span style={{ color: TECH.textDim }}>TASKS</span>
                                <span className="font-mono" style={{ color: cumplimiento === 100 ? '#10b981' : TECH.textMuted }}>
                                  {tareasCompletadas}/{totalTareas}
                                </span>
                              </div>
                              <div className="w-full h-1 rounded-full" style={{ backgroundColor: TECH.border }}>
                                <div className="h-1 rounded-full" style={{ 
                                  width: `${cumplimiento}%`,
                                  backgroundColor: cumplimiento === 100 ? '#10b981' : TECH.accent
                                }}></div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!evalSemana && (
                        <button onClick={(e) => { e.stopPropagation(); iniciarEvaluacion(emp); }}
                          className="mt-4 w-full py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ backgroundColor: TECH.border, color: TECH.textMuted }}>
                          + EVALUAR
                        </button>
                      )}
                    </div>

                    {/* Mini chart */}
                    {historial.length > 1 && (
                      <div className="px-5 pb-4 h-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historial.slice(-6)}>
                            <Line type="monotone" dataKey="promedio" stroke={TECH.accent} strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALERTAS */}
        {vista === 'alertas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">ALERTAS</h2>
                <p className="text-sm font-mono" style={{ color: TECH.textDim }}>{alertas.length} activas</p>
              </div>
              <div className="flex gap-2">
                {['todas', 'critical', 'warning', 'task', 'decline'].map(tipo => (
                  <button key={tipo} onClick={() => setFiltroAlerta(tipo)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: filtroAlerta === tipo ? TECH.accent : TECH.border,
                      boxShadow: filtroAlerta === tipo ? `0 0 10px ${TECH.accentGlow}` : 'none'
                    }}>
                    {tipo === 'todas' ? 'ALL' : tipo === 'critical' ? '■ CRIT' : tipo === 'warning' ? '● PEND' : tipo === 'task' ? '☰ TASK' : '▼ DOWN'}
                  </button>
                ))}
              </div>
            </div>

            {alertasFiltradas.length === 0 ? (
              <div className="rounded-xl border p-12 text-center" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <p className="text-4xl mb-4">◇</p>
                <p className="text-xl font-medium">ALL CLEAR</p>
                <p style={{ color: TECH.textDim }}>No hay alertas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertasFiltradas.map(alerta => (
                  <div key={alerta.id} className="rounded-xl border p-4 flex items-center justify-between"
                    style={{
                      backgroundColor: TECH.card,
                      borderColor: alerta.tipo === 'critical' ? '#ef4444' + '40' : alerta.tipo === 'warning' ? '#eab308' + '40' : TECH.border
                    }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: alerta.tipo === 'critical' ? '#ef4444' + '20' : alerta.tipo === 'warning' ? '#eab308' + '20' : TECH.border }}>
                        {alerta.tipo === 'critical' ? '■' : alerta.tipo === 'warning' ? '●' : alerta.tipo === 'task' ? '☰' : '▼'}
                      </div>
                      <div>
                        <p className="font-medium">{alerta.empleado}</p>
                        <p className="text-sm" style={{ color: TECH.textDim }}>{alerta.mensaje}</p>
                      </div>
                    </div>
                    <button onClick={() => {
                      const emp = empleados.find(e => e.id === alerta.empleadoId);
                      if (emp) alerta.tipo === 'warning' ? iniciarEvaluacion(emp) : setModalTareas(emp);
                    }}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: TECH.accent, boxShadow: `0 0 10px ${TECH.accentGlow}` }}>
                      {alerta.accion}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RANKING */}
        {vista === 'ranking' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">RANKING S{semanaActual}</h2>
            <div className="space-y-3">
              {getRanking().map((emp, idx) => {
                const status = getStatus(emp.promedio);
                const medalla = idx === 0 ? '◆' : idx === 1 ? '◇' : idx === 2 ? '○' : `#${idx + 1}`;
                return (
                  <div key={emp.id} className="rounded-xl border p-4 flex items-center gap-5"
                    style={{
                      backgroundColor: TECH.card,
                      borderColor: idx === 0 ? TECH.accent + '40' : TECH.border,
                      boxShadow: idx === 0 ? `0 0 20px ${TECH.accentGlow}` : 'none'
                    }}>
                    <div className="text-2xl w-10 text-center font-mono" style={{ color: idx === 0 ? TECH.accent : TECH.textDim }}>{medalla}</div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold border"
                      style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                      {emp.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{emp.nombre}</p>
                      <p className="text-xs font-mono" style={{ color: TECH.textDim }}>{emp.evaluado ? 'EVALUATED' : 'PENDING'}</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-2xl font-mono font-bold" style={{ color: status.color }}>{emp.promedio || '--'}</p>
                      <p className="text-xs" style={{ color: TECH.textDim }}>SCORE</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-2xl font-mono font-bold" style={{ color: emp.cumplimiento === 100 ? '#10b981' : TECH.textMuted }}>{emp.cumplimiento}%</p>
                      <p className="text-xs" style={{ color: TECH.textDim }}>TASKS</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAREAS */}
        {vista === 'tareas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">CONTROL DE TAREAS</h2>
              <div className="flex gap-2">
                {[semanaActual - 1, semanaActual].filter(s => s > 0).map(sem => (
                  <button key={sem} onClick={() => setSemanaActual(sem)}
                    className="px-4 py-2 rounded-lg text-sm font-mono"
                    style={{
                      backgroundColor: semanaActual === sem ? TECH.accent : TECH.border,
                      boxShadow: semanaActual === sem ? `0 0 10px ${TECH.accentGlow}` : 'none'
                    }}>
                    S{sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Círculos de progreso */}
            <div className="grid grid-cols-4 gap-4">
              {empleados.map(emp => {
                const evalSemana = evaluaciones.find(e => e.empleadoId === emp.id && e.semana === semanaActual);
                const tareas = evalSemana?.tareas || [];
                const completadas = tareas.filter(t => t.completada).length;
                const porcentaje = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;
                
                return (
                  <div key={emp.id} onClick={() => setModalTareas(emp)}
                    className="rounded-xl border p-5 text-center cursor-pointer hover:scale-105 transition"
                    style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke={TECH.border} strokeWidth="4" fill="none" />
                        <circle cx="32" cy="32" r="28"
                          stroke={porcentaje === 100 ? '#10b981' : TECH.accent}
                          strokeWidth="4" fill="none"
                          strokeDasharray={`${porcentaje * 1.76} 176`}
                          strokeLinecap="round"
                          style={{ filter: `drop-shadow(0 0 6px ${porcentaje === 100 ? '#10b981' : TECH.accentGlow})` }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-mono font-bold">{porcentaje}%</span>
                      </div>
                    </div>
                    <p className="font-medium text-sm">{emp.nombre.split(' ')[0]}</p>
                    <p className="text-xs font-mono" style={{ color: TECH.textDim }}>{completadas}/{tareas.length}</p>
                  </div>
                );
              })}
            </div>

            {/* Lista detallada */}
            <div className="grid grid-cols-2 gap-4">
              {empleados.map(emp => {
                const evalSemana = evaluaciones.find(e => e.empleadoId === emp.id && e.semana === semanaActual);
                const tareas = evalSemana?.tareas || [];
                
                return (
                  <div key={emp.id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: TECH.border }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border"
                          style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                          {emp.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{emp.nombre}</span>
                      </div>
                      <span className="text-xs font-mono px-2 py-1 rounded"
                        style={{
                          backgroundColor: tareas.filter(t => t.completada).length === tareas.length && tareas.length > 0 ? '#10b981' + '20' : TECH.border,
                          color: tareas.filter(t => t.completada).length === tareas.length && tareas.length > 0 ? '#10b981' : TECH.textMuted
                        }}>
                        {tareas.filter(t => t.completada).length}/{tareas.length}
                      </span>
                    </div>
                    <div className="p-4 max-h-48 overflow-y-auto">
                      {tareas.length === 0 ? (
                        <p className="text-center text-sm py-4" style={{ color: TECH.textDim }}>Sin tareas</p>
                      ) : (
                        <div className="space-y-2">
                          {tareas.map((t, i) => (
                            <div key={i} className="flex items-start gap-3 p-2 rounded-lg"
                              style={{ backgroundColor: t.completada ? '#10b981' + '10' : TECH.bg }}>
                              <span style={{ color: t.completada ? '#10b981' : TECH.textDim }}>{t.completada ? '◆' : '○'}</span>
                              <span className={`text-sm ${t.completada ? 'line-through' : ''}`}
                                style={{ color: t.completada ? TECH.textDim : 'white' }}>{t.texto}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EVALUAR */}
        {vista === 'evaluar' && evaluacionActual && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <div className="p-5 border-b" style={{ borderColor: TECH.border }}>
                <h2 className="text-xl font-bold">EVALUANDO: {evaluacionActual.empleadoNombre}</h2>
                <p className="text-sm font-mono" style={{ color: TECH.textDim }}>S{semanaActual}</p>
              </div>
              
              <div className="p-5 space-y-6">
                {/* Tareas */}
                <div className="rounded-xl p-4 border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                  <label className="text-xs uppercase tracking-wider block mb-3" style={{ color: TECH.textDim }}>☰ TAREAS</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={tareaInput}
                      onChange={e => setTareaInput(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter' && tareaInput.trim()) {
                          setEvaluacionActual({
                            ...evaluacionActual,
                            tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }]
                          });
                          setTareaInput('');
                        }
                      }}
                      className="flex-1 rounded-lg px-3 py-2 text-sm border"
                      style={{ backgroundColor: TECH.card, borderColor: TECH.border, color: 'white' }}
                      placeholder="Nueva tarea..." />
                    <button onClick={() => {
                      if (tareaInput.trim()) {
                        setEvaluacionActual({
                          ...evaluacionActual,
                          tareas: [...evaluacionActual.tareas, { texto: tareaInput.trim(), completada: false }]
                        });
                        setTareaInput('');
                      }
                    }}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: TECH.accent }}>+</button>
                  </div>
                  
                  {evaluacionActual.tareas.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {evaluacionActual.tareas.map((tarea, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: TECH.card }}>
                          <button onClick={() => {
                            const nuevasTareas = [...evaluacionActual.tareas];
                            nuevasTareas[idx].completada = !nuevasTareas[idx].completada;
                            setEvaluacionActual({ ...evaluacionActual, tareas: nuevasTareas });
                          }}
                            className="w-5 h-5 rounded border flex items-center justify-center"
                            style={{
                              backgroundColor: tarea.completada ? '#10b981' : 'transparent',
                              borderColor: tarea.completada ? '#10b981' : TECH.border
                            }}>
                            {tarea.completada && <span className="text-xs">✓</span>}
                          </button>
                          <span className={`flex-1 text-sm ${tarea.completada ? 'line-through' : ''}`}
                            style={{ color: tarea.completada ? TECH.textDim : 'white' }}>{tarea.texto}</span>
                          <button onClick={() => {
                            setEvaluacionActual({
                              ...evaluacionActual,
                              tareas: evaluacionActual.tareas.filter((_, i) => i !== idx)
                            });
                          }} style={{ color: TECH.textDim }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Criterios */}
                <div className="space-y-4">
                  {CRITERIOS.map(criterio => (
                    <div key={criterio.id}>
                      <div className="flex justify-between mb-2">
                        <label className="font-medium">{criterio.icon} {criterio.nombre}</label>
                        <span className="text-xs" style={{ color: TECH.textDim }}>{criterio.desc}</span>
                      </div>
                      <div className="flex gap-2">
                        {ESCALA.map(esc => (
                          <button key={esc.valor}
                            onClick={() => setEvaluacionActual({
                              ...evaluacionActual,
                              scores: { ...evaluacionActual.scores, [criterio.id]: esc.valor }
                            })}
                            className="flex-1 py-3 rounded-lg text-sm font-bold transition-all"
                            style={{
                              backgroundColor: esc.color,
                              opacity: evaluacionActual.scores[criterio.id] === esc.valor ? 1 : 0.4,
                              boxShadow: evaluacionActual.scores[criterio.id] === esc.valor ? `0 0 15px ${esc.color}` : 'none',
                              transform: evaluacionActual.scores[criterio.id] === esc.valor ? 'scale(1.05)' : 'scale(1)'
                            }}>
                            {esc.valor}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comentarios */}
                <div>
                  <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: TECH.textDim }}>💬 FEEDBACK</label>
                  <textarea value={evaluacionActual.comentarios}
                    onChange={e => setEvaluacionActual({ ...evaluacionActual, comentarios: e.target.value })}
                    className="w-full rounded-lg p-3 border"
                    style={{ backgroundColor: TECH.bg, borderColor: TECH.border, color: 'white' }}
                    rows={3} placeholder="Comentarios..." />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: TECH.border }}>
                  <div>
                    <p className="text-xs uppercase" style={{ color: TECH.textDim }}>Promedio</p>
                    <p className="text-4xl font-mono font-bold" style={{ color: TECH.accent }}>{calcularPromedio(evaluacionActual.scores)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setEvaluacionActual(null); setVista('canvas'); }}
                      className="px-5 py-2 rounded-lg" style={{ backgroundColor: TECH.border }}>Cancelar</button>
                    <button onClick={guardarEvaluacion}
                      className="px-5 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: TECH.accent, boxShadow: `0 0 15px ${TECH.accentGlow}` }}>Guardar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {vista === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-xl border p-5" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <h3 className="font-medium mb-4">EVOLUCIÓN SEMANAL</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...Array(6)].map((_, i) => {
                      const sem = semanaActual - 5 + i;
                      const evals = evaluaciones.filter(e => e.semana === sem);
                      const prom = evals.length > 0 ? evals.reduce((acc, e) => acc + parseFloat(calcularPromedio(e.scores)), 0) / evals.length : null;
                      return { semana: `S${sem}`, promedio: prom };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke={TECH.border} />
                      <XAxis dataKey="semana" tick={{ fill: TECH.textDim, fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fill: TECH.textDim }} />
                      <Tooltip contentStyle={{ backgroundColor: TECH.card, border: `1px solid ${TECH.border}`, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="promedio" stroke={TECH.accent} strokeWidth={2} dot={{ fill: TECH.accent }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
                <h3 className="font-medium mb-4">POR CRITERIO</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CRITERIOS.map(c => {
                      const evals = evaluaciones.filter(e => e.semana === semanaActual);
                      const prom = evals.length > 0 ? evals.reduce((acc, e) => acc + (e.scores[c.id] || 0), 0) / evals.length : 0;
                      return { criterio: c.nombre, promedio: prom };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke={TECH.border} />
                      <XAxis dataKey="criterio" tick={{ fill: TECH.textDim, fontSize: 10 }} />
                      <YAxis domain={[0, 5]} tick={{ fill: TECH.textDim }} />
                      <Tooltip contentStyle={{ backgroundColor: TECH.card, border: `1px solid ${TECH.border}`, borderRadius: 8 }} />
                      <Bar dataKey="promedio" fill={TECH.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EQUIPO */}
        {vista === 'equipo' && (
          <div className="space-y-6">
            <div className="rounded-xl border p-5" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <h3 className="font-medium mb-4">AGREGAR EMPLEADO</h3>
              <div className="flex gap-3">
                <input type="text" placeholder="Nombre completo" value={nuevoEmpleado.nombre}
                  onChange={e => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
                  className="flex-1 rounded-lg px-4 py-2 border"
                  style={{ backgroundColor: TECH.bg, borderColor: TECH.border, color: 'white' }} />
                <button onClick={agregarEmpleado}
                  className="px-5 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: TECH.accent, boxShadow: `0 0 10px ${TECH.accentGlow}` }}>
                  + Agregar
                </button>
              </div>
            </div>

            <div className="rounded-xl border" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <div className="p-4 border-b" style={{ borderColor: TECH.border }}>
                <h2 className="font-medium">EQUIPO ({empleados.length})</h2>
              </div>
              <div className="divide-y" style={{ borderColor: TECH.border }}>
                {empleados.map(emp => {
                  const promedio = getPromedioEmpleado(emp.id);
                  const status = getStatus(promedio);
                  return (
                    <div key={emp.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold border"
                          style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                          {emp.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <p className="font-medium">{emp.nombre}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-mono font-bold" style={{ color: status.color }}>{promedio || '--'}</span>
                        <button onClick={() => eliminarEmpleado(emp.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {vista === 'historial' && (
          <div className="space-y-6">
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: TECH.card, borderColor: TECH.border }}>
              <div className="p-4 border-b" style={{ borderColor: TECH.border }}>
                <h2 className="font-medium">LOG DE EVALUACIONES</h2>
              </div>
              {evaluaciones.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-2">☰</p>
                  <p style={{ color: TECH.textDim }}>Sin registros</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: TECH.bg }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: TECH.textDim }}>Empleado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase" style={{ color: TECH.textDim }}>Sem</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase" style={{ color: TECH.textDim }}>Tasks</th>
                        {CRITERIOS.map(c => (
                          <th key={c.id} className="px-4 py-3 text-center text-xs" style={{ color: TECH.textDim }}>{c.icon}</th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase" style={{ color: TECH.textDim }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluaciones.sort((a, b) => b.semana - a.semana).map((ev, idx) => {
                        const promedio = calcularPromedio(ev.scores);
                        const status = getStatus(promedio);
                        const completadas = ev.tareas?.filter(t => t.completada).length || 0;
                        const total = ev.tareas?.length || 0;
                        return (
                          <tr key={idx} className="border-t" style={{ borderColor: TECH.border }}>
                            <td className="px-4 py-3 font-medium">{ev.empleadoNombre}</td>
                            <td className="px-4 py-3 text-center font-mono" style={{ color: TECH.textDim }}>S{ev.semana}</td>
                            <td className="px-4 py-3 text-center font-mono" style={{ color: completadas === total && total > 0 ? '#10b981' : TECH.textMuted }}>
                              {completadas}/{total}
                            </td>
                            {CRITERIOS.map(c => (
                              <td key={c.id} className="px-4 py-3 text-center font-mono">{ev.scores[c.id] || '-'}</td>
                            ))}
                            <td className="px-4 py-3 text-center font-mono font-bold" style={{ color: status.color }}>{promedio}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {modalTareas && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl border w-full max-w-2xl max-h-[90vh] overflow-hidden"
            style={{ backgroundColor: TECH.card, borderColor: TECH.accent + '40', boxShadow: `0 0 30px ${TECH.accentGlow}` }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: TECH.border }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold border"
                  style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                  {modalTareas.nombre.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{modalTareas.nombre}</h2>
                  <p className="text-sm font-mono" style={{ color: TECH.textDim }}>S{semanaActual}</p>
                </div>
              </div>
              <button onClick={() => setModalTareas(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TECH.border }}>✕</button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-150px)]">
              {(() => {
                const evalSemana = evaluaciones.find(e => e.empleadoId === modalTareas.id && e.semana === semanaActual);
                const tareas = evalSemana?.tareas || [];
                const completadas = tareas.filter(t => t.completada).length;
                const porcentaje = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;
                const promedio = evalSemana ? calcularPromedio(evalSemana.scores) : null;
                const status = getStatus(promedio);

                return (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                        <p className="text-3xl font-mono font-bold" style={{ color: TECH.accent }}>{completadas}/{tareas.length}</p>
                        <p className="text-xs" style={{ color: TECH.textDim }}>TASKS</p>
                      </div>
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                        <p className="text-3xl font-mono font-bold" style={{ color: porcentaje >= 80 ? '#10b981' : porcentaje >= 50 ? '#eab308' : '#f97316' }}>{porcentaje}%</p>
                        <p className="text-xs" style={{ color: TECH.textDim }}>DONE</p>
                      </div>
                      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                        <p className="text-3xl font-mono font-bold" style={{ color: status.color }}>{promedio || '--'}</p>
                        <p className="text-xs" style={{ color: TECH.textDim }}>SCORE</p>
                      </div>
                    </div>

                    {tareas.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: TECH.textDim }}>☰ TAREAS</h3>
                        <div className="space-y-2">
                          {tareas.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border"
                              style={{ backgroundColor: t.completada ? '#10b981' + '10' : TECH.bg, borderColor: t.completada ? '#10b981' + '30' : TECH.border }}>
                              <span style={{ color: t.completada ? '#10b981' : TECH.textDim }}>{t.completada ? '◆' : '○'}</span>
                              <span className={`flex-1 ${t.completada ? 'line-through' : ''}`}
                                style={{ color: t.completada ? TECH.textDim : 'white' }}>{t.texto}</span>
                              <span className="text-xs px-2 py-1 rounded font-mono"
                                style={{ backgroundColor: t.completada ? '#10b981' + '20' : '#f97316' + '20', color: t.completada ? '#10b981' : '#f97316' }}>
                                {t.completada ? 'DONE' : 'PEND'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evalSemana && (
                      <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: TECH.textDim }}>◉ SCORES</h3>
                        <div className="grid grid-cols-5 gap-2">
                          {CRITERIOS.map(c => {
                            const score = evalSemana.scores[c.id];
                            const scoreColor = score >= 4 ? '#10b981' : score >= 3 ? '#eab308' : score >= 2 ? '#f97316' : '#ef4444';
                            return (
                              <div key={c.id} className="rounded-lg p-3 text-center border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                                <div className="text-xl font-mono font-bold" style={{ color: scoreColor }}>{score || '-'}</div>
                                <p className="text-xs" style={{ color: TECH.textDim }}>{c.nombre}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {evalSemana?.comentarios && (
                      <div className="rounded-xl p-4 border" style={{ backgroundColor: TECH.bg, borderColor: TECH.border }}>
                        <p className="text-xs uppercase mb-1" style={{ color: TECH.textDim }}>FEEDBACK</p>
                        <p className="italic" style={{ color: TECH.textMuted }}>"{evalSemana.comentarios}"</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: TECH.border }}>
              <button onClick={() => setModalTareas(null)}
                className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: TECH.border }}>Cerrar</button>
              <button onClick={() => { iniciarEvaluacion(modalTareas); setModalTareas(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: TECH.accent, boxShadow: `0 0 10px ${TECH.accentGlow}` }}>
                {evaluaciones.find(e => e.empleadoId === modalTareas.id && e.semana === semanaActual) ? 'Editar' : 'Evaluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
