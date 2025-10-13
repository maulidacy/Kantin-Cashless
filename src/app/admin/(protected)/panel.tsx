'use client'
import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowser } from '@/src/lib/supabaseClient'

type OrderRow = { id:string; status:string; total_amount:number; table_no:string; customer_name:string; created_at:string }
type Staff = { ok:boolean; role:'admin'|'cashier'|'customer'; email:string; name:string }

export default function AdminClient() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [me, setMe] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(false)
  const supa = useMemo(() => createSupabaseBrowser(), [])

  const loadOrders = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/orders', { cache: 'no-store' })
    if (r.ok) setRows((await r.json()).orders)
    setLoading(false)
  }
  const loadMe = async () => {
    const r = await fetch('/api/staff/me', { cache: 'no-store' })
    if (r.ok) setMe(await r.json())
  }

  useEffect(() => {
    loadMe(); loadOrders()
    const id = setInterval(loadOrders, 5000)
    return () => clearInterval(id)
  }, [])

  // Notifikasi realtime: pesanan baru (insert orders)
  useEffect(() => {
    const channel = supa
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new as any
        // prepend dan beri notifikasi ringan
        setRows(prev => [{ id:o.id, status:o.status, total_amount:o.total_amount, table_no:o.table_no, customer_name:o.customer_name, created_at:o.created_at }, ...prev])
        if (Notification && Notification.permission === 'granted') {
          new Notification('Pesanan baru', { body: `${o.customer_name} • Meja ${o.table_no} • Rp${Number(o.total_amount).toLocaleString('id-ID')}` })
        }
      })
      .subscribe()
    if (Notification && Notification.permission === 'default') Notification.requestPermission().catch(()=>{})
    return () => { supa.removeChannel(channel) }
  }, [supa])

  const markPaid = async (id:string) => {
    const r = await fetch('/api/admin/mark-paid', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ order_id:id })})
    if (r.ok) loadOrders(); else alert('Gagal')
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Staff</h1>
          {me && (
            <p className="text-sm text-gray-600">
              Masuk sebagai <b>{me.name}</b> (<span className="uppercase">{me.role}</span>) — {me.email}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Admin-only: link kelola menu */}
          {me?.role === 'admin' && (
            <a href="/admin/menu" className="px-3 py-1 rounded-xl border">Kelola Menu</a>
          )}
          <a href="/admin/logout" className="px-3 py-1 rounded-xl border">Logout</a>
        </div>
      </header>

      {/* Cashier & Admin: tabel antrian */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Antrian Pesanan</h2>
          {loading && <span className="text-xs text-gray-500">Memuat…</span>}
        </div>
        <table className="w-full text-sm border rounded-2xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr><th className="p-2 text-left">Waktu</th><th className="p-2 text-left">ID</th><th className="p-2">Nama</th><th className="p-2">Meja</th><th className="p-2">Total</th><th className="p-2">Status</th><th className="p-2">Aksi</th></tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="p-2">{new Date(r.created_at).toLocaleTimeString()}</td>
                <td className="p-2">{r.id.slice(0,8)}…</td>
                <td className="p-2">{r.customer_name}</td>
                <td className="p-2 text-center">{r.table_no}</td>
                <td className="p-2 text-right">Rp{Number(r.total_amount).toLocaleString('id-ID')}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  {/* Cashier/Admin boleh mark paid untuk CASH */}
                  <button className="px-3 py-1 rounded-xl border" onClick={()=>markPaid(r.id)}>Mark Paid (Cash)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Admin-only: form tambah menu singkat */}
      {me?.role === 'admin' && (
        <AdminAddMenuForm onAdded={loadOrders} />
      )}
    </main>
  )
}

// Komponen form tambah menu (admin-only)
function AdminAddMenuForm({ onAdded }: { onAdded: ()=>void }) {
  const [name,setName]=useState(''); const [price,setPrice]=useState(''); const [stall,setStall]=useState(''); const [saving,setSaving]=useState(false)
  const [stalls,setStalls]=useState<any[]>([])
  useEffect(()=>{ (async()=>{
    const r=await fetch('/api/admin/stalls'); if(r.ok){ setStalls((await r.json()).stalls||[]) }
  })() },[])
  const submit=async(e:React.FormEvent)=>{ e.preventDefault(); setSaving(true)
    const r=await fetch('/api/admin/menu-items/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ name, price:Number(price), stall_id:stall })})
    setSaving(false)
    if(r.ok){ setName(''); setPrice(''); setStall(''); alert('Menu ditambahkan'); onAdded() } else alert('Gagal menambah menu')
  }
  return (
    <section className="mt-6 border rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold">Tambah Menu (Admin)</h2>
      <form onSubmit={submit} className="grid sm:grid-cols-4 gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Nama menu" className="border rounded-xl px-3 py-2" />
        <input value={price} onChange={e=>setPrice(e.target.value)} required type="number" min={0} placeholder="Harga" className="border rounded-xl px-3 py-2" />
        <select value={stall} onChange={e=>setStall(e.target.value)} required className="border rounded-xl px-3 py-2">
          <option value="">Pilih kios</option>
          {stalls.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button disabled={saving} className="bg-black text-white rounded-xl px-4">{saving?'Menyimpan…':'Tambah'}</button>
      </form>
    </section>
  )
}
