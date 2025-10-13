'use client'
import { useEffect, useState } from 'react'

export default function AdminMenuPage() {
  const [stalls, setStalls] = useState<any[]>([])
  const [menu, setMenu] = useState<any[]>([])
  const load = async () => {
    const s = await fetch('/api/admin/stalls').then(r=>r.json())
    const m = await fetch('/api/admin/menu-items').then(r=>r.json())
    setStalls(s.stalls || []); setMenu(m.items || [])
  }
  useEffect(()=>{ load() }, [])

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Kelola Menu</h1>
      <section>
        <h2 className="font-semibold mb-2">Kios</h2>
        <ul className="space-y-1">{stalls.map((s:any)=>(<li key={s.id}>{s.name}</li>))}</ul>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Item</h2>
        <table className="w-full text-sm border rounded-2xl">
          <thead><tr><th className="p-2 text-left">Nama</th><th className="p-2">Harga</th><th className="p-2">Stok</th><th className="p-2">Aktif</th></tr></thead>
          <tbody>
            {menu.map((m:any)=>(
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.name}</td>
                <td className="p-2 text-right">Rp{Number(m.price).toLocaleString('id-ID')}</td>
                <td className="p-2 text-center">{m.stock}</td>
                <td className="p-2 text-center">{m.is_active ? '✓' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
