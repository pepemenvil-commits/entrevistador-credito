import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { empresa, giro, monto, bien, contacto, contexto, correo_ejecutivo } = body;

    if (!empresa || !giro || !correo_ejecutivo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: empresa, giro, correo_ejecutivo' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('sesiones')
      .insert({
        empresa,
        giro,
        monto: monto || null,
        bien: bien || null,
        contacto: contacto || null,
        contexto: contexto || '',
        correo_ejecutivo,
        status: 'pendiente',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
