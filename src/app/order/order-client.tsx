'use client'
import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type Stall = { id: string; name: string }
type MenuItem = {
  id: string; stall_id: string; name: string; description?: string | null;
  image_url?: string | null; category?: string | null; price: number; stock: number
}

type CartItem = { id: string; name: string; price: number; stall_id: string; qty: number }

const CartKey = 'kantinqr:cart'

export default function OrderClient({ initialStalls, initialMenu }:{
  initialStalls: Stall[]; initialMenu: MenuItem[]
}) {
  const [stallFilter, setStallFilter] = useState<string>('all')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(CartKey)
    if (raw) setCart(JSON.parse(raw))
  }, [])
  useEffect(() => {
    localStorage.setItem(CartKey, JSON.stringify(cart))
  }, [cart])

  const filtered = useMemo(() => initialMenu.filter(m => {
    const passStall = stallFilter === 'all' || m.stall_id === stallFilter
    const passQ = !q || m.name.toLowerCase().includes(q.toLowerCase())
    return passStall && passQ
  }), [initialMenu, stallFilter, q])

  const add = (m: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(p => p.id === m.id)
      if (idx >= 0) {
        const copy = [...prev]; copy[idx].qty += 1; return copy
      }
      return [...prev, { id: m.id, name: m.name, price: Number(m.price), stall_id: m.stall_id, qty: 1 }]
    })
  }

  const total = cart.reduce((s,c)=> s + c.price*c.qty, 0)

  const router = useRouter()

  const goCheckout = () => {
    router.push('/checkout')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-3 items-center">
        <select aria-label="Filter kios" className="border rounded-2xl px-3 py-2"
          value={stallFilter} onChange={e=>setStallFilter(e.target.value)}>
          <option value="all">Semua kios</option>
          {initialStalls?.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input aria-label="Cari menu" placeholder="Cari menu..."
          className="border rounded-2xl px-3 py-2 flex-1 min-w-48"
          value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {filtered.map(m=>(
          <article key={m.id} className="border rounded-2xl p-3 bg-white flex flex-col">
            <div className="relative h-36 mb-2 overflow-hidden rounded-xl">
              <Image
                src={m.image_url || '/placeholder.png'} alt={m.name} fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority={false}
              />
            </div>
            <h3 className="font-semibold">{m.name}</h3>
            {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
            <div className="mt-auto flex items-center justify-between">
              <span className="font-medium">Rp{Number(m.price).toLocaleString('id-ID')}</span>
              <button className="px-3 py-1 rounded-xl bg-black text-white"
                onClick={()=>add(m)} aria-label={`Tambah ${m.name} ke keranjang`}>
                + Keranjang
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Floating cart */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <button disabled={!cart.length}
          onClick={goCheckout}
          className="shadow-lg px-5 py-3 rounded-full bg-black text-white">
          Keranjang • {cart.length} item • Rp{total.toLocaleString('id-ID')}
        </button>
      </div>
    </div>
  )
}
