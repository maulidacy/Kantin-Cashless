import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'
export async function GET() {
  const supa = await getSupabaseAdmin()
  const { data, error } = await supa.from('menu_items').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}
