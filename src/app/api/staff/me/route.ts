import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/src/lib/supabaseClient'

export async function GET() {
  const supa = createSupabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { data: prof } = await supa.from('profiles')
    .select('email,role,name').eq('id', user.id).maybeSingle()

  return NextResponse.json({
    ok: true,
    email: prof?.email ?? user.email,
    role: prof?.role ?? 'customer',
    name: prof?.name ?? user.email?.split('@')[0]
  })
}
