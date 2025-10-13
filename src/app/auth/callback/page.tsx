'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/src/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supa = createSupabaseBrowser()
      await supa.auth.exchangeCodeForSession(window.location.href)
      router.replace('/admin')
    }
    run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">Memverifikasi login...</p>
    </main>
  )
}
