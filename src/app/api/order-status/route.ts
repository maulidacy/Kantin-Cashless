import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  const token = req.nextUrl.searchParams.get('t')
  if (!orderId || !token) return NextResponse.json({ error: 'Missing' }, { status: 400 })
  const supa = await getSupabaseAdmin()
  const { data, error } = await supa.from('orders')
    .select('id,status,total_amount,table_no,dine_option,created_at,customer_name,customer_email')
    .eq('id', orderId).eq('public_token', token).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ order: data })
}
