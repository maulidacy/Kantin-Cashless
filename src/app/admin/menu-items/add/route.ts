import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'
import { createSupabaseServer } from '@/src/lib/supabaseClient'

const schema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().nonnegative(),
  stall_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  // Authz: hanya admin
  const supaSrv = createSupabaseServer()
  const { data: { user } } = await supaSrv.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: prof } = await supaSrv.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(()=>null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const supa = await getSupabaseAdmin()
  const { error } = await supa.from('menu_items').insert({
    stall_id: parsed.data.stall_id,
    name: parsed.data.name,
    price: parsed.data.price,
    stock: 0,
    is_active: true
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
