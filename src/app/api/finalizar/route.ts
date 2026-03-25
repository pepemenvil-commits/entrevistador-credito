import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { RESUMEN_PROMPT } from '@/lib/system-prompt';
import { generateWordBuffer } from '@/lib/generate-word';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Claude + Word + email

function getAnthropic() {
  const apiKey = process.env.APP_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('APP_ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const { sesion_id } = await req.json();

    if (!sesion_id) {
      return NextResponse.json({ error: 'sesion_id requerido' }, { status: 400 });
    }

    console.log('[finalizar] Starting for session:', sesion_id);

    // 1. Fetch session
    const { data: sesion, error: sesionError } = await supabase
      .from('sesiones')
      .select('*')
      .eq('id', sesion_id)
      .single();

    if (sesionError || !sesion) {
      console.error('[finalizar] Session not found:', sesionError);
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // 2. Fetch all messages
    const { data: mensajes, error: mensajesError } = await supabase
      .from('mensajes')
      .select('*')
      .eq('sesion_id', sesion_id)
      .order('orden', { ascending: true });

    if (mensajesError || !mensajes || mensajes.length === 0) {
      console.error('[finalizar] No messages found:', mensajesError);
      return NextResponse.json({ error: 'No hay mensajes en esta sesión' }, { status: 400 });
    }

    console.log('[finalizar] Found', mensajes.length, 'messages. Generating summary...');

    // 3. Build transcript for summary
    const transcript = mensajes
      .map((m) => {
        const role = m.role === 'assistant' ? 'Analista' : 'Prospecto';
        return `${role}: ${m.content.replace('ENTREVISTA_COMPLETADA', '').trim()}`;
      })
      .join('\n\n');

    // 4. Generate summary with Claude
    let resumen = '';
    try {
      const summaryResponse = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: RESUMEN_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Empresa: ${sesion.empresa}\nGiro: ${sesion.giro}\n\nTRANSCRIPCIÓN DE LA ENTREVISTA:\n\n${transcript}`,
          },
        ],
      });

      resumen =
        summaryResponse.content[0].type === 'text' ? summaryResponse.content[0].text : '';
      console.log('[finalizar] Summary generated, length:', resumen.length);
    } catch (claudeErr) {
      console.error('[finalizar] Claude API error generating summary:', claudeErr);
      resumen = 'Error al generar resumen automático. Revisar transcripción completa.';
    }

    // 5. Update session in Supabase
    const { error: updateError } = await supabase
      .from('sesiones')
      .update({
        resumen,
        status: 'completada',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sesion_id);

    if (updateError) {
      console.error('[finalizar] Error updating session:', updateError);
    } else {
      console.log('[finalizar] Session updated to completada');
    }

    // 6. Generate Word document
    let wordBuffer: Buffer | null = null;
    try {
      wordBuffer = await generateWordBuffer(sesion, mensajes, resumen);
      console.log('[finalizar] Word document generated, size:', wordBuffer.length, 'bytes');
    } catch (wordErr) {
      console.error('[finalizar] Error generating Word document:', wordErr);
    }

    // 7. Send email with Resend
    if (wordBuffer && sesion.correo_ejecutivo) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'CASOFIN Entrevistas <onboarding@resend.dev>';

        const emailResult = await getResend().emails.send({
          from: fromAddress,
          to: sesion.correo_ejecutivo,
          subject: `Entrevista completada: ${sesion.empresa}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">CASOFIN</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">Arrendadora Financiera</p>
              </div>
              <div style="padding: 20px;">
                <h2 style="color: #1a365d;">Entrevista de crédito completada</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Empresa:</td><td>${sesion.empresa}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Giro:</td><td>${sesion.giro}</td></tr>
                  ${sesion.monto ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Monto:</td><td>${sesion.monto}</td></tr>` : ''}
                  ${sesion.bien ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Bien:</td><td>${sesion.bien}</td></tr>` : ''}
                </table>
                <p>Se adjunta el reporte completo de la entrevista en formato Word.</p>
                <hr style="border: 1px solid #e2e8f0;">
                <h3 style="color: #1a365d;">Resumen Ejecutivo</h3>
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; background: #f7fafc; padding: 15px; border-radius: 8px;">${resumen}</pre>
              </div>
              <div style="padding: 15px; text-align: center; color: #a0aec0; font-size: 12px; border-top: 1px solid #e2e8f0;">
                Generado automáticamente por el sistema de entrevistas CASOFIN
              </div>
            </div>
          `,
          attachments: [
            {
              filename: `Entrevista_${sesion.empresa.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`,
              content: wordBuffer,
            },
          ],
        });

        console.log('[finalizar] Email sent successfully:', emailResult);
      } catch (emailError) {
        console.error('[finalizar] Error sending email via Resend:', emailError);
        // Don't fail — the summary is saved, just email failed
      }
    } else {
      console.warn('[finalizar] Skipping email: wordBuffer is null or no correo_ejecutivo');
    }

    console.log('[finalizar] Complete for session:', sesion_id);
    return NextResponse.json({ resumen });
  } catch (err) {
    console.error('[finalizar] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
