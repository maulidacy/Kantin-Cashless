import { createSupabaseServer } from '@/src/lib/supabaseClient'
import OrderClient from './order-client'

export const revalidate = 60 // cache menu 60s

export default async function OrderPage() {
  const supabase = await createSupabaseServer()
  const { data: stalls } = await supabase.from('stalls').select('*').eq('is_active', true)
  const { data: menu } = await supabase.from('menu_items')
    .select('*').eq('is_active', true)

  return <OrderClient initialStalls={stalls ?? []} initialMenu={menu ?? []} />
}
