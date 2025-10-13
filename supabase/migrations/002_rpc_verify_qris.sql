create or replace function public.verify_qris_payment(order_id uuid, qris_ref text, ok boolean)
returns void
language plpgsql
security definer
as $$
begin
  if ok then
    update public.payments set status='verified', qris_ref=qris_ref, paid_at=now() where order_id=verify_qris_payment.order_id;
    update public.orders set status='paid' where id=verify_qris_payment.order_id;
    insert into public.audit_logs(action, entity, entity_id, meta)
      values ('qris_verified', 'order', verify_qris_payment.order_id, jsonb_build_object('qris_ref', qris_ref));
  else
    update public.payments set status='failed', qris_ref=qris_ref where order_id=verify_qris_payment.order_id;
    insert into public.audit_logs(action, entity, entity_id, meta)
      values ('qris_failed', 'order', verify_qris_payment.order_id, jsonb_build_object('qris_ref', qris_ref));
  end if;
end; $$;
