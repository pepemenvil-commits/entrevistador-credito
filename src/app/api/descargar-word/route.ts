import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateWordBuffer } from '@/lib/generate-word';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sesionId = req.nextUrl.searchParams.get('sesion_id');
  if (!sesionId) {
    return NextResponse.json({ error: 'sesion_id requerido' }, { status: 400 });
  }

  const { data: sesion } = await supabase
    .from('sesiones')
    .select('*')
    .eq('id', sesionId)
    .single();

  if (!sesion) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 });
  }

  const { data: mensajes } = await supabase
    .from('mensajes')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('orden', { ascending: true });

  const buffer = await generateWordBuffer(sesion, mensajes || [], sesion.resumen || '');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Entrevista_${sesion.empresa.replace(/\s+/g, '_')}.docx"`,
    },
  });
}
