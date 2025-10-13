// API staff-only: list orders.
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'
import { requireStaff } from '@/src/lib/auth'

export async function GET() {
  await requireStaff()
  const supa = await getSupabaseAdmin()
  const { data, error } = await supa.from('orders')
    .select('id,status,total_amount,table_no,customer_name,created_at')
    .in('status',['pending','paid','preparing','ready'])
    .order('created_at',{ ascending:false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
