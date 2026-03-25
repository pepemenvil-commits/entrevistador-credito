'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function EntrevistaPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [empresa, setEmpresa] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Fetch session info
  useEffect(() => {
    fetch(`/api/sesiones`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.find((x: { id: string; empresa: string; status: string }) => x.id === id);
        if (s) {
          setEmpresa(s.empresa);
          if (s.status === 'completada') setDone(true);
        }
      })
      .catch(console.error);
  }, [id]);

  // Get first question
  useEffect(() => {
    if (done) return;
    fetch(`/api/chat?sesion_id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.mensaje) {
          setMessages([{ role: 'assistant', content: data.mensaje }]);
          setQuestionCount(data.questionCount || 1);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, done]);

  const sendMessage = async () => {
    if (!input.trim() || sending || done) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesion_id: id, mensaje: userMsg }),
      });

      const data = await res.json();

      if (data.mensaje) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.mensaje }]);
        setQuestionCount(data.questionCount || questionCount + 1);
      }

      if (data.done) {
        // Finalize — generate summary, Word doc, and send email
        setFinalizing(true);
        try {
          const finRes = await fetch('/api/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesion_id: id }),
          });
          if (!finRes.ok) {
            const errData = await finRes.json().catch(() => ({}));
            console.error('Error finalizando:', finRes.status, errData);
          }
        } catch (finErr) {
          console.error('Error llamando /api/finalizar:', finErr);
        } finally {
          setFinalizing(false);
          setDone(true);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un error. Por favor intente de nuevo.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalQuestions = 15;
  const progress = Math.min((questionCount / totalQuestions) * 100, 100);

  if (finalizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4 animate-spin inline-block">&#9881;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-3">Generando reporte...</h1>
          <p className="text-gray-600 text-sm">
            Estamos procesando sus respuestas. Esto puede tomar unos segundos.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Gracias por su tiempo</h1>
          <p className="text-gray-600">
            Su informacion ha sido recibida exitosamente. Un ejecutivo de CASOFIN se pondra en
            contacto con usted pronto.
          </p>
          <div className="mt-6 pt-4 border-t text-sm text-gray-400">CASOFIN Arrendadora Financiera</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a365d] text-white px-4 py-3 shadow-md flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-sm font-bold tracking-wide">CASOFIN</h1>
              {empresa && <p className="text-blue-200 text-xs">{empresa}</p>}
            </div>
            <span className="text-xs text-blue-200">
              Pregunta {questionCount} / ~{totalQuestions}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-blue-900 rounded-full h-1.5">
            <div
              className="bg-blue-300 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {loading ? (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-[85%]">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-pulse">Preparando entrevista...</div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#1a365d] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escriba su respuesta..."
            rows={1}
            disabled={sending || loading}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '44px';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || loading}
            className="bg-[#1a365d] text-white px-5 rounded-xl font-medium hover:bg-[#2a4a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
