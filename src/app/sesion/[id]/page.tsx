'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Sesion {
  id: string;
  empresa: string;
  giro: string;
  status: string;
  resumen: string | null;
  monto: string | null;
  bien: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-gray-700', bg: 'bg-gray-200' },
  en_curso: { label: 'En curso', color: 'text-yellow-800', bg: 'bg-yellow-200' },
  completada: { label: 'Completada', color: 'text-green-800', bg: 'bg-green-200' },
};

export default function SesionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [copied, setCopied] = useState(false);
  const sesionId = Array.isArray(id) ? id[0] : id;

  const entrevistaUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/entrevista/${sesionId}`
    : '';

  const fetchSesion = async () => {
    try {
      const res = await fetch(`/api/sesiones?id=${sesionId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find((s: Sesion) => s.id === sesionId);
          if (found) setSesion(found);
        } else if (data?.id) {
          setSesion(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSesion();
    const interval = setInterval(fetchSesion, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId]);

  const copyLink = () => {
    navigator.clipboard.writeText(entrevistaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola, le comparto el siguiente link para completar la entrevista de credito con CASOFIN:\n\n${entrevistaUrl}\n\nPor favor, abra el link y responda las preguntas. Gracias.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const downloadWord = async () => {
    const res = await fetch(`/api/descargar-word?sesion_id=${sesionId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Entrevista_${sesion?.empresa.replace(/\s+/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!sesion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  const sc = statusConfig[sesion.status] || statusConfig.pendiente;

  return (
    <div className="min-h-screen">
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-blue-200 hover:text-white transition-colors"
          >
            &larr; Panel
          </button>
          <div>
            <h1 className="text-xl font-bold">{sesion.empresa}</h1>
            <p className="text-blue-200 text-sm">Sesion de entrevista</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Estado de la entrevista</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${sc.bg} ${sc.color}`}>
              {sc.label}
            </span>
          </div>
          {sesion.status !== 'completada' && (
            <p className="text-sm text-gray-500">
              El estado se actualiza automaticamente cada 10 segundos.
            </p>
          )}
        </div>

        {/* Link */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Link de entrevista</h2>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={entrevistaUrl}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={openWhatsApp}
            className="w-full bg-green-500 text-white py-2.5 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar por WhatsApp
          </button>
        </div>

        {/* Completed section */}
        {sesion.status === 'completada' && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-700">Entrevista completada</h2>
            <button
              onClick={downloadWord}
              className="w-full bg-[#1a365d] text-white py-2.5 rounded-lg font-medium hover:bg-[#2a4a7f] transition-colors"
            >
              Descargar reporte Word
            </button>
            {sesion.resumen && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Resumen Ejecutivo</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-700">
                  {sesion.resumen}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
