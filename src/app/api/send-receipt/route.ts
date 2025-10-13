import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'
import { sendReceiptEmail } from '@/src/lib/email'

export async function POST(req: NextRequest) {
  const { order_id } = await req.json().catch(()=>({}))
  if (!order_id) return NextResponse.json({ error: 'Missing' }, { status: 400 })
  // Only internal call (e.g., from webhook) by shared secret header
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(process.env.SUPABASE_SERVICE_ROLE_KEY!)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supa = await getSupabaseAdmin()
  const { data: order } = await supa.from('orders')
    .select('id, customer_email, table_no, total_amount')
    .eq('id', order_id).single()
  const { data: items } = await supa.from('order_items')
    .select('qty, unit_price, menu_items(name)').eq('order_id', order_id)

  const { data: pay } = await supa.from('payments').select('method,status').eq('order_id', order_id).single()

  if (!order || !items?.length || pay?.status !== 'verified') {
    return NextResponse.json({ error: 'Not ready' }, { status: 400 })
  }

  await sendReceiptEmail({
    to: order.customer_email,
    orderId: order.id,
    items: items.map(i=>({ name: i.menu_items.name, qty: i.qty, price: Number(i.unit_price) })),
    total: Number(order.total_amount),
    method: pay.method, table_no: order.table_no
  })
  return NextResponse.json({ ok: true })
}
