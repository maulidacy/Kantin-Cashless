// Guard halaman /admin/* di server: hanya staff (cashier/admin) yang boleh lolos.
import { createSupabaseServer } from '@/src/lib/supabaseClient'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = await createSupabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/admin/login')

  let { data: prof } = await supa.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()

  // Auto-create profile for new staff users (default to cashier)
  if (!prof) {
    const { error } = await supa.from('profiles').insert({
      id: user.id,
      email: user.email!,
      role: 'cashier' as const
    })
    if (error) {
      console.error('Failed to create profile:', error)
      redirect('/admin/login?error=profile_creation_failed')
    }
    // Re-fetch after insert
    ({ data: prof } = await supa.from('profiles')
      .select('role').eq('id', user.id).single())
  }

  const role = prof?.role || 'customer'
  if (!['cashier','admin'].includes(role)) redirect('/admin/login?msg=unauthorized')

  return <>{children}</>
}
