import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '@/lib/system-prompt';

export const dynamic = 'force-dynamic';

function getAnthropic() {
  const apiKey = process.env.APP_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('APP_ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

export async function GET(req: NextRequest) {
  try {
    const sesionId = req.nextUrl.searchParams.get('sesion_id');
    if (!sesionId) {
      return NextResponse.json({ error: 'sesion_id requerido' }, { status: 400 });
    }

    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .select('*')
      .eq('id', sesionId)
      .single();

    if (sesionError || !sesion) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Check if there are existing messages
    const { data: mensajes } = await supabase
      .from('mensajes')
      .select('*')
      .eq('sesion_id', sesionId)
      .order('orden', { ascending: true });

    if (mensajes && mensajes.length > 0) {
      const lastAssistant = mensajes.filter((m) => m.role === 'assistant').pop();
      return NextResponse.json({
        mensaje: lastAssistant?.content || '',
        questionCount: mensajes.filter((m) => m.role === 'assistant').length,
        done: false,
      });
    }

    // Generate first question
    const systemPrompt = getSystemPrompt(sesion);

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Inicia la entrevista. Saluda y haz la primera pregunta.',
        },
      ],
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Save the initial "trigger" as a hidden system message and the assistant response
    await supabase.from('mensajes').insert({
      sesion_id: sesionId,
      role: 'assistant',
      content: assistantMessage,
      orden: 1,
    });

    // Update status to en_curso
    await supabase
      .from('sesiones')
      .update({ status: 'en_curso' })
      .eq('id', sesionId);

    return NextResponse.json({
      mensaje: assistantMessage,
      questionCount: 1,
      done: false,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : '';
    console.error('Error in GET /api/chat:', errorMessage, errorStack);
    return NextResponse.json({ error: 'Error interno', details: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sesion_id, mensaje } = await req.json();

    if (!sesion_id || !mensaje) {
      return NextResponse.json({ error: 'sesion_id y mensaje requeridos' }, { status: 400 });
    }

    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .select('*')
      .eq('id', sesion_id)
      .single();

    if (sesionError || !sesion) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Get existing messages
    const { data: mensajesExistentes } = await supabase
      .from('mensajes')
      .select('*')
      .eq('sesion_id', sesion_id)
      .order('orden', { ascending: true });

    const currentMessages = mensajesExistentes || [];
    const nextOrden = currentMessages.length + 1;

    // Save user message
    await supabase.from('mensajes').insert({
      sesion_id,
      role: 'user',
      content: mensaje,
      orden: nextOrden,
    });

    // Build Claude message history
    const systemPrompt = getSystemPrompt(sesion);
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // First hidden user message that triggered the interview
    claudeMessages.push({
      role: 'user',
      content: 'Inicia la entrevista. Saluda y haz la primera pregunta.',
    });

    for (const msg of currentMessages) {
      claudeMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add current user message
    claudeMessages.push({ role: 'user', content: mensaje });

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Save assistant message
    await supabase.from('mensajes').insert({
      sesion_id,
      role: 'assistant',
      content: assistantMessage,
      orden: nextOrden + 1,
    });

    const done = assistantMessage.includes('ENTREVISTA_COMPLETADA');
    const cleanMessage = assistantMessage.replace('ENTREVISTA_COMPLETADA', '').trim();

    const questionCount = currentMessages.filter((m) => m.role === 'assistant').length + 1;

    return NextResponse.json({
      mensaje: cleanMessage,
      questionCount,
      done,
    });
  } catch (err) {
    console.error('Error in POST /api/chat:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
