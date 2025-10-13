import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'

const cartItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().nonnegative(),
  stall_id: z.string().uuid(),
  qty: z.number().int().positive()
})

const bodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email(),
  dine_option: z.enum(['dine_in','takeaway']),
  table_no: z.string().min(1),
  payment_method: z.enum(['QRIS','CASH']),
  cart: z.array(cartItemSchema).min(1)
})

export async function POST(req: NextRequest) {
  // Basic CSRF: check Origin for same-site requests
  const origin = req.headers.get('origin')
  const host = process.env.APP_BASE_URL
  if (origin && host && !origin.startsWith(host)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 400 })
  }

  const idem = req.headers.get('x-idempotency-key')?.slice(0,100)
  if (!idem) return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400 })

  const json = await req.json().catch(()=>null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { name, phone, email, dine_option, table_no, payment_method, cart } = parsed.data

  const supa = await getSupabaseAdmin()

  // Fetch authoritative prices & items (server trusts DB only)
  const ids = cart.map(c=>c.id)
  const { data: items, error: itemErr } = await supa
    .from('menu_items').select('id,stall_id,price,is_active,stock').in('id', ids)

  if (itemErr) return NextResponse.json({ error: 'Menu fetch error' }, { status: 500 })

  // validate availability & prices
  const priceMap = new Map(items?.map(i=>[i.id, i]) ?? [])
  for (const c of cart) {
    const i = priceMap.get(c.id)
    if (!i || !i.is_active || i.stock < c.qty) {
      return NextResponse.json({ error: 'Item unavailable' }, { status: 400 })
    }
  }

  const total = cart.reduce((s,c)=>{
    const i = priceMap.get(c.id)!; return s + Number(i.price)*c.qty
  }, 0)

  // breakdown per stall
  const byStall: Record<string, number> = {}
  for (const c of cart) {
    const i = priceMap.get(c.id)!
    byStall[i.stall_id] = (byStall[i.stall_id] ?? 0) + Number(i.price)*c.qty
  }

  // create order + items + payment (idempotent on payments.idempotency_key unique)
  const { data: order, error: orderErr } = await supa
    .from('orders')
    .insert({
      customer_email: email,
      customer_name: name,
      phone,
      dine_option,
      table_no,
      total_amount: total,
      stall_breakdown: byStall
    })
    .select('id, public_token')
    .single()

  if (orderErr) return NextResponse.json({ error: 'Order create failed' }, { status: 500 })

  const orderItems = cart.map(c=>{
    const i = priceMap.get(c.id)!
    return {
      order_id: order.id,
      menu_item_id: c.id,
      stall_id: i.stall_id,
      qty: c.qty,
      unit_price: i.price
    }
  })
  const { error: oiErr } = await supa.from('order_items').insert(orderItems)
  if (oiErr) return NextResponse.json({ error: 'Order items failed' }, { status: 500 })

  const { error: payErr } = await supa.from('payments').insert({
    order_id: order.id,
    method: payment_method,
    status: payment_method === 'CASH' ? 'pending' : 'pending',
    idempotency_key: idem
  })
  if (payErr && !String(payErr.message).includes('duplicate key')) {
    return NextResponse.json({ error: 'Payment init failed' }, { status: 500 })
  }

  if (payment_method === 'QRIS') {
    // Call Edge Function to create QR intent
    const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payments-qris-create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ order_id: order.id, amount: total, idempotency_key: idem })
    })
    if (!resp.ok) {
      return NextResponse.json({ error: 'QRIS intent failed' }, { status: 500 })
    }
    const { qris_ref, qr_string, qr_url } = await resp.json()
    // Return orderId + token + qris payload to render modal QR jika mau (sederhana: status page menunggu)
    return NextResponse.json({ orderId: order.id, token: order.public_token, qris_ref, qr_string, qr_url })
  }

  // CASH: langsung ke status; kasir validasi manual
  return NextResponse.json({ orderId: order.id, token: order.public_token })
}
