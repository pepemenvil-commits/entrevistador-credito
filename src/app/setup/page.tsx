'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    empresa: '',
    giro: '',
    monto: '',
    bien: '',
    contacto: '',
    correo_ejecutivo: '',
    contexto: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/crear-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/sesion/${id}`);
      } else {
        alert('Error al crear la sesion');
      }
    } catch {
      alert('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-xl font-bold">Nueva Entrevista</h1>
            <p className="text-blue-200 text-sm">Configura los datos del prospecto</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 text-lg">Datos del prospecto</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Empresa *
                </label>
                <input
                  name="empresa"
                  value={form.empresa}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Giro *
                </label>
                <input
                  name="giro"
                  value={form.giro}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="Ej: Construccion, Transporte, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Monto</label>
                <input
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="Ej: $2,500,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Bien a arrendar
                </label>
                <input
                  name="bien"
                  value={form.bien}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="Ej: Retroexcavadora CAT 320"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Contacto
                </label>
                <input
                  name="contacto"
                  value={form.contacto}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Correo del ejecutivo *
                </label>
                <input
                  name="correo_ejecutivo"
                  type="email"
                  value={form.correo_ejecutivo}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                  placeholder="ejecutivo@casofin.com"
                />
              </div>
            </div>
          </div>

          {/* Context */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 text-lg">Contexto adicional</h2>
            <p className="text-sm text-gray-500">
              Pega aqui informacion relevante del prospecto: notas, antecedentes, datos financieros, etc.
            </p>
            <textarea
              name="contexto"
              value={form.contexto}
              onChange={handleChange}
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-y"
              placeholder="Notas del ejecutivo, informacion relevante, antecedentes..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.empresa || !form.giro || !form.correo_ejecutivo}
            className="w-full bg-[#1a365d] text-white py-3 rounded-xl font-semibold text-lg hover:bg-[#2a4a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando sesion...' : 'Generar link de entrevista'}
          </button>
        </form>
      </main>
    </div>
  );
}
