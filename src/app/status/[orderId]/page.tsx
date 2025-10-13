'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function StatusPage({ params }: { params: { orderId: string } }) {
  const sp = useSearchParams()
  const token = sp.get('t')!
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let alive = true
    const pull = async () => {
      const res = await fetch(`/api/order-status?orderId=${params.orderId}&t=${token}`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (alive) setData(j.order)
      }
    }
    pull()
    const id = setInterval(pull, 3000)
    return () => { alive=false; clearInterval(id) }
  }, [params.orderId, token])

  if (!data) return <main className="max-w-2xl mx-auto p-6">Memuat...</main>

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Status Pesanan</h1>
      <p>ID: {data.id}</p>
      <p>Status: <b>{data.status}</b></p>
      <p>Total: Rp{Number(data.total_amount).toLocaleString('id-ID')}</p>
      <p>Meja: {data.table_no} • {data.dine_option}</p>
      <p>Atas nama: {data.customer_name}</p>
    </main>
  )
}
