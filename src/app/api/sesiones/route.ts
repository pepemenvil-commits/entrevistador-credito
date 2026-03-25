import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('sesiones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('sesiones')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }

  // Delete messages first (foreign key)
  const { error: msgError } = await supabase
    .from('mensajes')
    .delete()
    .eq('sesion_id', id);

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  // Delete session
  const { error: sesError } = await supabase
    .from('sesiones')
    .delete()
    .eq('id', id);

  if (sesError) {
    return NextResponse.json({ error: sesError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
