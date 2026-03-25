import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sesionId = req.nextUrl.searchParams.get('sesion_id');
  if (!sesionId) {
    return NextResponse.json({ error: 'sesion_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mensajes')
    .select('role, content, orden')
    .eq('sesion_id', sesionId)
    .order('orden', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
