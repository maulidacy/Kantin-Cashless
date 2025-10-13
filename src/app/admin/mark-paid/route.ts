// API staff-only: validasi pembayaran tunai -> set paid + audit log.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'
import { requireStaff } from '@/src/lib/auth'

const schema = z.object({ order_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const staff = await requireStaff()
  const body = await req.json().catch(()=>null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const supa = await getSupabaseAdmin()
  const { data: pay } = await supa.from('payments').select('*').eq('order_id', parsed.data.order_id).single()
  if (!pay) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (pay.method !== 'CASH') return NextResponse.json({ error: 'Not cash' }, { status: 400 })

  await supa.from('payments').update({ status:'verified', paid_at:new Date().toISOString(), cashier_id: staff.id })
    .eq('order_id', parsed.data.order_id)
  await supa.from('orders').update({ status:'paid' }).eq('id', parsed.data.order_id)
  await supa.from('audit_logs').insert({ action:'cash_mark_paid', actor_id: staff.id, entity:'order', entity_id: parsed.data.order_id, meta:{} })

  return NextResponse.json({ ok: true })
}
