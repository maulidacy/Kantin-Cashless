'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/src/lib/supabaseClient'

export default function Logout() {
  const router = useRouter()
  useEffect(() => {
    const run = async () => {
      const supa = createSupabaseBrowser()
      await supa.auth.signOut()
      router.replace('/admin/login')
    }
    run()
  }, [router])

  return (
    <main className="flex h-screen items-center justify-center">
      <p className="text-gray-500">Keluar...</p>
    </main>
  )
}
