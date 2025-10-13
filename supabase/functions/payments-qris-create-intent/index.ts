// Supabase Edge Function (Deno) — Create QRIS intent via Midtrans Core API (Sandbox)
// Docs: POST /v2/charge + payment_type=qris
// https://docs.midtrans.com/reference/qris
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

type ReqBody = { order_id: string; amount: number; idempotency_key: string }

const MIDTRANS_BASE_URL = Deno.env.get("MIDTRANS_BASE_URL") || "https://api.sandbox.midtrans.com"
const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!
const SRV_KEY_FOR_BASIC = btoa(`${MIDTRANS_SERVER_KEY}:`) // Basic Auth

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

    // optional: hanya izinkan service role (kalau kamu panggil dari Next API pakai header Authorization service key)
    const auth = req.headers.get('authorization') || ''
    const srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!auth.includes(srv)) return new Response("Unauthorized", { status: 401 })

    const body = await req.json().catch(() => null) as ReqBody | null
    if (!body?.order_id || !body?.amount || !body?.idempotency_key) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
    }

    // Midtrans Core API charge: QRIS
    const chargePayload = {
      payment_type: "qris",
      transaction_details: {
        order_id: body.order_id,               // gunakan UUID order dari DB kamu
        gross_amount: Math.round(body.amount)  // integer
      }
      // optional: tambahkan customer_details / item_details jika perlu
    }

    const res = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${SRV_KEY_FOR_BASIC}`,
        "Idempotency-Key": body.idempotency_key
      },
      body: JSON.stringify(chargePayload)
    })

    if (!res.ok) {
      const txt = await res.text()
      return new Response(JSON.stringify({ error: "midtrans_charge_failed", detail: txt }), { status: 502 })
    }

    const data = await res.json()

    // Midtrans QRIS response biasanya menyertakan 'actions' (qr code URL) &/atau 'qr_string'
    const qris_ref = data.transaction_id || data.acquirer || data.order_id
    const qr_string = data.qr_string || null
    const qr_url = (Array.isArray(data.actions)
      ? data.actions.find((a: any) => a.name?.toLowerCase().includes("qr") || a.method === "GET")?.url
      : null) || data.qr_code || null

    return new Response(JSON.stringify({ qris_ref, qr_string, qr_url, raw: data }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(e) }), { status: 500 })
  }
})
