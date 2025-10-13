// Guard halaman /admin/* di server: hanya staff (cashier/admin) yang boleh lolos.
import { createSupabaseServer } from '@/src/lib/supabaseClient'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = await createSupabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: prof } = await supa.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()
  const role = prof?.role || 'customer'
  if (!['cashier','admin'].includes(role)) redirect('/admin/login')

  return <>{children}</>
}
