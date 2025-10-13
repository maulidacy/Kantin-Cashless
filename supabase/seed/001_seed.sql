insert into public.stalls (id, name, description) values
  (gen_random_uuid(),'Kopi Mantap','Kopi & minuman'),
  (gen_random_uuid(),'Nasi Cepat','Makanan cepat saji');

-- ambil id dinamis
with s as (select id, name from public.stalls)
insert into public.menu_items (stall_id, name, description, category, price, stock, is_active)
select (select id from s where name='Kopi Mantap'), 'Americano', 'Kopi hitam', 'Minuman', 18000, 100, true union all
select (select id from s where name='Kopi Mantap'), 'Latte', 'Kopi susu', 'Minuman', 24000, 100, true union all
select (select id from s where name='Nasi Cepat'), 'Nasi Ayam', 'Ayam + nasi', 'Makanan', 28000, 100, true union all
select (select id from s where name='Nasi Cepat'), 'Mie Goreng', 'Mie spesial', 'Makanan', 25000, 100, true;
