'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

interface FileItem {
  name: string;
  status: 'procesando' | 'listo' | 'error';
  text: string;
}

export default function SetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error('PDF.js no cargado');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  };

  const extractTextFromExcel = async (file: File): Promise<string> => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) throw new Error('SheetJS no cargado');
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    let text = '';
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      text += `[Hoja: ${name}]\n`;
      text += XLSX.utils.sheet_to_csv(ws) + '\n\n';
    }
    return text;
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const mammoth = (window as any).mammoth;
    if (!mammoth) throw new Error('Mammoth no cargado');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromPPTX = async (file: File): Promise<string> => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) throw new Error('JSZip no cargado');
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = '';
    const slideFiles = Object.keys(zip.files)
      .filter((f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
      .sort();
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async('string');
      const matches = xml.match(/<a:t>(.*?)<\/a:t>/g);
      if (matches) {
        text += matches.map((m: string) => m.replace(/<\/?a:t>/g, '')).join(' ') + '\n';
      }
    }
    return text;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    for (const file of selectedFiles) {
      const fileItem: FileItem = { name: file.name, status: 'procesando', text: '' };
      setFiles((prev) => [...prev, fileItem]);

      try {
        let text = '';
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        if (ext === 'pdf') {
          text = await extractTextFromPDF(file);
        } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
          text = await extractTextFromExcel(file);
        } else if (['docx', 'doc'].includes(ext)) {
          text = await extractTextFromWord(file);
        } else if (ext === 'pptx') {
          text = await extractTextFromPPTX(file);
        } else {
          text = await file.text();
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: 'listo', text } : f
          )
        );
      } catch (err) {
        console.error(`Error extracting ${file.name}:`, err);
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: 'error', text: '' } : f
          )
        );
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fileTexts = files
      .filter((f) => f.status === 'listo' && f.text)
      .map((f) => `[Archivo: ${f.name}]\n${f.text}`)
      .join('\n\n---\n\n');

    const fullContext = [fileTexts, form.contexto].filter(Boolean).join('\n\n---\n\n');

    try {
      const res = await fetch('/api/crear-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contexto: fullContext }),
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

  const statusChip: Record<string, { bg: string; text: string; label: string }> = {
    procesando: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Procesando...' },
    listo: { bg: 'bg-green-100', text: 'text-green-700', label: 'Listo' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
  };

  return (
    <>
      {/* CDN Scripts */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" strategy="beforeInteractive" />

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

            {/* File upload */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h2 className="font-semibold text-gray-700 text-lg">Documentos del prospecto</h2>
              <p className="text-sm text-gray-500">
                Sube archivos PDF, Excel, Word, PowerPoint o CSV. El texto se extraera automaticamente.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-gray-500 text-sm">
                  Click para seleccionar archivos o arrastralos aqui
                </p>
                <p className="text-gray-400 text-xs mt-1">PDF, XLSX, DOCX, PPTX, CSV</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.txt"
                onChange={handleFiles}
                className="hidden"
              />

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f) => {
                    const chip = statusChip[f.status];
                    return (
                      <div
                        key={f.name}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${chip.bg} ${chip.text}`}
                      >
                        <span className="max-w-[200px] truncate">{f.name}</span>
                        <span>{chip.label}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(f.name)}
                          className="ml-1 hover:opacity-70"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Context */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h2 className="font-semibold text-gray-700 text-lg">Contexto adicional</h2>
              <textarea
                name="contexto"
                value={form.contexto}
                onChange={handleChange}
                rows={4}
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
    </>
  );
}
