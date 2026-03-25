'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Sesion {
  id: string;
  empresa: string;
  giro: string;
  status: string;
  resumen: string | null;
  created_at: string;
  completed_at: string | null;
  correo_ejecutivo: string;
  monto: string | null;
  bien: string | null;
  contacto: string | null;
}

interface Mensaje {
  role: string;
  content: string;
  orden: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  en_curso: { label: 'En curso', color: 'text-yellow-800', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  completada: { label: 'Completada', color: 'text-green-800', bg: 'bg-green-50', dot: 'bg-green-500' },
};

export default function PanelPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sesion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'en_curso' | 'completada'>('todas');
  const router = useRouter();

  const fetchSesiones = useCallback(async () => {
    try {
      const res = await fetch('/api/sesiones');
      if (res.ok) {
        const data = await res.json();
        setSesiones(data);
        // If a session is selected, update it with fresh data
        if (selected) {
          const updated = data.find((s: Sesion) => s.id === selected.id);
          if (updated) {
            setSelected(updated);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sesiones:', err);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // Initial fetch
  useEffect(() => {
    fetchSesiones();
  }, []);

  // Auto-refresh every 10 seconds to catch completed interviews
  useEffect(() => {
    const interval = setInterval(fetchSesiones, 10000);
    return () => clearInterval(interval);
  }, [fetchSesiones]);

  const openDetail = async (sesion: Sesion) => {
    setSelected(sesion);
    setMensajes([]);

    if (sesion.status === 'completada') {
      setLoadingMensajes(true);
      try {
        const res = await fetch(`/api/mensajes?sesion_id=${sesion.id}`);
        if (res.ok) {
          const data = await res.json();
          setMensajes(data);
        }
      } catch (err) {
        console.error('Error fetching mensajes:', err);
      } finally {
        setLoadingMensajes(false);
      }
    }
  };

  const downloadWord = async (sesionId: string, empresa: string) => {
    setDownloading(sesionId);
    try {
      const res = await fetch(`/api/descargar-word?sesion_id=${sesionId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Entrevista_${empresa.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Error al descargar el documento');
      }
    } catch (err) {
      console.error('Error downloading Word:', err);
      alert('Error al descargar el documento');
    } finally {
      setDownloading(null);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setMensajes([]);
  };

  const deleteSesion = async (sesionId: string, empresa: string) => {
    if (!confirm(`Eliminar la sesion de "${empresa}" y todos sus mensajes? Esta accion no se puede deshacer.`)) {
      return;
    }
    setDeleting(sesionId);
    try {
      const res = await fetch(`/api/sesiones?id=${sesionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selected?.id === sesionId) {
          closeDetail();
        }
        await fetchSesiones();
      } else {
        alert('Error al eliminar la sesion');
      }
    } catch (err) {
      console.error('Error deleting sesion:', err);
      alert('Error al eliminar la sesion');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'todas'
    ? sesiones
    : sesiones.filter((s) => s.status === filter);

  const counts = {
    todas: sesiones.length,
    pendiente: sesiones.filter((s) => s.status === 'pendiente').length,
    en_curso: sesiones.filter((s) => s.status === 'en_curso').length,
    completada: sesiones.filter((s) => s.status === 'completada').length,
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CASOFIN</h1>
            <p className="text-blue-200 text-sm">Panel de Entrevistas de Credito</p>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="bg-white text-[#1a365d] px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-sm"
          >
            + Nueva entrevista
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {([
            { key: 'todas' as const, label: 'Total', icon: '📋', bgColor: 'bg-white' },
            { key: 'pendiente' as const, label: 'Pendientes', icon: '⏳', bgColor: 'bg-gray-50' },
            { key: 'en_curso' as const, label: 'En curso', icon: '💬', bgColor: 'bg-yellow-50' },
            { key: 'completada' as const, label: 'Completadas', icon: '✅', bgColor: 'bg-green-50' },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`${item.bgColor} rounded-xl p-4 text-left border transition-all ${
                filter === item.key
                  ? 'ring-2 ring-blue-400 border-blue-300 shadow-md'
                  : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-2xl font-bold text-gray-800">{counts[item.key]}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex gap-6">
          {/* Session list */}
          <div className={`transition-all duration-300 ${selected ? 'w-5/12' : 'w-full'}`}>
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="animate-pulse text-lg">Cargando sesiones...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-gray-500 mb-2">
                  {filter === 'todas'
                    ? 'No hay sesiones aun'
                    : `No hay sesiones ${statusConfig[filter]?.label.toLowerCase() || ''}`}
                </p>
                {filter === 'todas' && (
                  <button
                    onClick={() => router.push('/setup')}
                    className="mt-3 text-blue-600 hover:underline text-sm font-medium"
                  >
                    Crear primera entrevista
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((s) => {
                  const sc = statusConfig[s.status] || statusConfig.pendiente;
                  const isSelected = selected?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => openDetail(s)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-400 shadow-md' : 'shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800 truncate">{s.empresa}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color} flex-shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="truncate">{s.giro}</span>
                            {s.monto && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="font-medium text-gray-600">{s.monto}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>{formatDate(s.created_at)}</span>
                            {s.correo_ejecutivo && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>{s.correo_ejecutivo}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {s.status === 'completada' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadWord(s.id, s.empresa);
                              }}
                              disabled={downloading === s.id}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Descargar Word"
                            >
                              {downloading === s.id ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </button>
                          )}
                          {s.status !== 'completada' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/sesion/${s.id}`);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver link de entrevista"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSesion(s.id, s.empresa);
                            }}
                            disabled={deleting === s.id}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar sesion"
                          >
                            {deleting === s.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Preview of resumen for completed sessions */}
                      {s.status === 'completada' && s.resumen && !isSelected && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {s.resumen.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-7/12 transition-all duration-300">
              <div className="bg-white rounded-xl shadow-sm border sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                {/* Detail header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-xl z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{selected.empresa}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const sc = statusConfig[selected.status] || statusConfig.pendiente;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          );
                        })()}
                        <span className="text-xs text-gray-400">{formatDate(selected.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.status === 'completada' && (
                        <button
                          onClick={() => downloadWord(selected.id, selected.empresa)}
                          disabled={downloading === selected.id}
                          className="inline-flex items-center gap-2 bg-[#1a365d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a4a7f] transition-colors disabled:opacity-50"
                        >
                          {downloading === selected.id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Generando...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Descargar Word
                            </>
                          )}
                        </button>
                      )}
                      {selected.status !== 'completada' && (
                        <button
                          onClick={() => router.push(`/sesion/${selected.id}`)}
                          className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Ver link
                        </button>
                      )}
                      <button
                        onClick={closeDetail}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4">
                  {/* Session details grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <DetailField label="Giro" value={selected.giro} />
                    <DetailField label="Monto" value={selected.monto || 'No especificado'} />
                    <DetailField label="Bien" value={selected.bien || 'No especificado'} />
                    <DetailField label="Contacto" value={selected.contacto || 'No especificado'} />
                    <DetailField label="Ejecutivo" value={selected.correo_ejecutivo} />
                    {selected.completed_at && (
                      <DetailField label="Completada" value={formatDate(selected.completed_at)} />
                    )}
                  </div>

                  {/* Completed session content */}
                  {selected.status === 'completada' && (
                    <>
                      {/* Resumen */}
                      {selected.resumen && (
                        <div className="mb-6">
                          <h4 className="flex items-center gap-2 font-semibold text-gray-800 mb-3 text-base">
                            <span className="w-1 h-5 bg-blue-500 rounded-full" />
                            Resumen Ejecutivo
                          </h4>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap border border-blue-100">
                            {selected.resumen}
                          </div>
                        </div>
                      )}

                      {/* Q&A */}
                      <div>
                        <h4 className="flex items-center gap-2 font-semibold text-gray-800 mb-3 text-base">
                          <span className="w-1 h-5 bg-green-500 rounded-full" />
                          Preguntas y Respuestas
                          {mensajes.length > 0 && (
                            <span className="text-xs text-gray-400 font-normal">
                              ({mensajes.filter((m) => m.role === 'assistant').length} preguntas)
                            </span>
                          )}
                        </h4>

                        {loadingMensajes ? (
                          <div className="text-center py-8 text-gray-400">
                            <div className="animate-pulse">Cargando conversacion...</div>
                          </div>
                        ) : mensajes.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No se encontraron mensajes
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {mensajes.map((msg, i) => {
                              const isAssistant = msg.role === 'assistant';
                              const cleanContent = msg.content.replace('ENTREVISTA_COMPLETADA', '').trim();
                              if (!cleanContent) return null;

                              return (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg text-sm ${
                                    isAssistant
                                      ? 'bg-blue-50 border-l-3 border-blue-400'
                                      : 'bg-gray-50 border-l-3 border-gray-300 ml-4'
                                  }`}
                                >
                                  <p className={`font-semibold text-xs mb-1 ${
                                    isAssistant ? 'text-blue-600' : 'text-gray-500'
                                  }`}>
                                    {isAssistant ? 'Analista CASOFIN' : 'Prospecto'}
                                  </p>
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Pending/In progress sessions */}
                  {selected.status === 'pendiente' && (
                    <div className="text-center py-12">
                      <p className="text-4xl mb-3">⏳</p>
                      <p className="text-gray-600 font-medium mb-1">Entrevista pendiente</p>
                      <p className="text-gray-400 text-sm mb-4">El prospecto aun no ha iniciado la entrevista</p>
                      <button
                        onClick={() => router.push(`/sesion/${selected.id}`)}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Copiar link de entrevista
                      </button>
                    </div>
                  )}

                  {selected.status === 'en_curso' && (
                    <div className="text-center py-12">
                      <p className="text-4xl mb-3">💬</p>
                      <p className="text-gray-600 font-medium mb-1">Entrevista en curso</p>
                      <p className="text-gray-400 text-sm mb-1">El prospecto esta respondiendo las preguntas</p>
                      <p className="text-gray-400 text-xs">El panel se actualizara automaticamente al completarse</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-700 truncate">{value}</p>
    </div>
  );
}
