alter table public.lunaria_records drop constraint lunaria_records_kind_check;
alter table public.lunaria_records add constraint lunaria_records_kind_check check(kind in ('client','service','invoice','task','team','settings','activity','prospect','quotation'));
create unique index if not exists lunaria_quotation_number_unique on public.lunaria_records(owner_id,(payload->>'number')) where kind='quotation';
create unique index if not exists lunaria_prospect_client_unique on public.lunaria_records(owner_id,(payload->>'sourceProspectId')) where kind='client' and coalesce(payload->>'sourceProspectId','')<>'';
CREATE OR REPLACE FUNCTION public.lunaria_save_record(p_id text, p_kind text, p_payload jsonb, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare previous public.lunaria_records; saved public.lunaria_records; event jsonb; p jsonb; total numeric; received numeric; ref_kind text; ref_id text;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.lunaria_admins where user_id=(select auth.uid())) then raise exception 'Admin access required' using errcode='42501';end if;
 if p_kind not in ('client','service','invoice','task','team','settings','prospect','quotation') then raise exception 'Invalid record type' using errcode='22023';end if;
 if octet_length(p_payload::text)>150000 then raise exception 'Record too large' using errcode='22023';end if;
 select * into previous from public.lunaria_records where id=p_id and owner_id=(select auth.uid()) for update;
 if p_expected_version is null and found then raise exception 'Record already exists' using errcode='23505';end if;
 if p_expected_version is not null and (previous.id is null or previous.version<>p_expected_version or previous.kind<>p_kind) then raise exception 'This record changed in another session. Refresh and try again.' using errcode='P0001';end if;
 foreach ref_kind in array array['client','team'] loop
  ref_id=case when ref_kind='client' then p_payload->>'clientId' else p_payload->>'ownerId' end;
  if coalesce(ref_id,'')<>'' and not exists(select 1 from public.lunaria_records where id=ref_id and kind=ref_kind and owner_id=(select auth.uid())) then raise exception 'Choose an existing %',ref_kind using errcode='22023';end if;
 end loop;
 if p_kind='prospect' then
  if coalesce(p_payload->>'name','')='' or p_payload->>'stage' not in ('New','Contacted','Meeting','Quotation sent','Negotiation','Won','Lost') then raise exception 'Invalid prospect' using errcode='22023';end if;
  if p_payload->>'stage'='Lost' and coalesce(p_payload->>'lostReason','')='' then raise exception 'Add a lost reason' using errcode='22023';end if;
 end if;
 if p_kind='quotation' then
  if coalesce(p_payload->>'number','')='' or coalesce(p_payload->>'company','')='' then raise exception 'Invalid quotation' using errcode='22023';end if;
  if p_payload->>'recipientKind' not in ('prospect','client','manual') or p_payload->>'status' not in ('Draft','Sent','Accepted','Declined','Expired') then raise exception 'Invalid quotation status or recipient' using errcode='22023';end if;
  if p_payload->>'recipientKind'<>'manual' and not exists(select 1 from public.lunaria_records where id=p_payload->>'recipientId' and kind=p_payload->>'recipientKind' and owner_id=(select auth.uid())) then raise exception 'Choose an existing recipient' using errcode='22023';end if;
  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items') not between 1 and 40 then raise exception 'Add quotation items' using errcode='22023';end if;
  total=0;
  for p in select value from jsonb_array_elements(p_payload->'items') loop
   if (p->>'quantity')::numeric<1 or (p->>'quantity')::numeric<>trunc((p->>'quantity')::numeric) or (p->>'rateCents')::numeric<0 or (p->>'rateCents')::numeric<>trunc((p->>'rateCents')::numeric) then raise exception 'Invalid quotation item' using errcode='22023';end if;
   total=total+(p->>'quantity')::numeric*(p->>'rateCents')::numeric;
  end loop;
  if (p_payload->>'discountCents')::numeric<0 or (p_payload->>'discountCents')::numeric>total or (p_payload->>'taxBps')::numeric not between 0 and 10000 then raise exception 'Invalid discount or tax' using errcode='22023';end if;
  total=total-(p_payload->>'discountCents')::numeric;
  total=total+round(total*(p_payload->>'taxBps')::numeric/10000);
  if total<=0 or total>10000000000 then raise exception 'Invalid quotation total' using errcode='22023';end if;
  if jsonb_typeof(p_payload->'milestones')<>'array' then raise exception 'Invalid installments' using errcode='22023';end if;
  if jsonb_array_length(p_payload->'milestones')>0 then
   select sum((value->>'amountCents')::numeric) into received from jsonb_array_elements(p_payload->'milestones');
   if received<>total then raise exception 'Installments must add up to the total' using errcode='22023';end if;
  end if;
  if (p_payload->>'validUntil')::date<(p_payload->>'issued')::date then raise exception 'Validity must follow the quotation date' using errcode='22023';end if;
 end if;
 if p_kind='invoice' then
  total=(p_payload->>'amountCents')::numeric;
  if total<=0 or total<>trunc(total) then raise exception 'Invalid invoice total' using errcode='22023';end if;
  if jsonb_typeof(p_payload->'payments')<>'array' then raise exception 'Invalid payment records' using errcode='22023';end if;
  select coalesce(sum((item->>'amountCents')::numeric),0) into received from jsonb_array_elements(p_payload->'payments') item;
  if received>total then raise exception 'Payments cannot exceed invoice total' using errcode='22023';end if;
  if (p_payload->>'void')::boolean and jsonb_array_length(p_payload->'payments')>0 then raise exception 'An invoice with payments cannot be voided' using errcode='22023';end if;
  for p in select value from jsonb_array_elements(p_payload->'payments') loop
   if (p->>'amountCents')::numeric<=0 or (p->>'amountCents')::numeric<>trunc((p->>'amountCents')::numeric) then raise exception 'Invalid payment amount' using errcode='22023';end if;
   if (p->>'date')::date > (now() at time zone 'Asia/Dubai')::date then raise exception 'A received payment cannot have a future date' using errcode='22023';end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_payload->'payments')) <> (select count(distinct x->>'id') from jsonb_array_elements(p_payload->'payments') x) then raise exception 'Duplicate payment' using errcode='22023';end if;
  if previous.id is not null then
   for p in select value from jsonb_array_elements(previous.payload->'payments') loop
    if not (p_payload->'payments') @> jsonb_build_array(p) then raise exception 'Recorded payments cannot be changed or removed' using errcode='22023';end if;
   end loop;
   if jsonb_array_length(previous.payload->'payments')>0 and previous.payload->>'clientId' is distinct from p_payload->>'clientId' then raise exception 'The client on an invoice with payments cannot be changed' using errcode='22023';end if;
  end if;
 end if;
 if previous.id is null then
  insert into public.lunaria_records(id,owner_id,kind,payload) values(p_id,(select auth.uid()),p_kind,p_payload) returning * into saved;
 else
  update public.lunaria_records set payload=p_payload,version=version+1,updated_at=now() where id=p_id and owner_id=(select auth.uid()) returning * into saved;
 end if;
 event=jsonb_build_object('title',case when previous.id is null then 'Added ' else 'Updated ' end||p_kind,'detail',coalesce(p_payload->>'name',p_payload->>'title',p_payload->>'number','Workspace settings'),'recordId',p_id,'clientId',case when p_kind='client' then p_id else coalesce(p_payload->>'clientId','') end,'prospectId',case when p_kind='prospect' then p_id when p_kind='quotation' and p_payload->>'recipientKind'='prospect' then p_payload->>'recipientId' else '' end,'actor',(select auth.jwt())->>'email');
 insert into public.lunaria_records(id,owner_id,kind,payload) values(gen_random_uuid()::text,(select auth.uid()),'activity',event);
 return jsonb_build_object('id',saved.id,'kind',saved.kind,'data',saved.payload,'version',saved.version,'createdAt',saved.created_at,'updatedAt',saved.updated_at);
end;
$function$;

create or replace function public.lunaria_convert_prospect(p_id text,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare lead public.lunaria_records; client public.lunaria_records; cid text; body jsonb;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.lunaria_admins where user_id=(select auth.uid())) then raise exception 'Admin access required' using errcode='42501';end if;
 select * into lead from public.lunaria_records where id=p_id and kind='prospect' and owner_id=(select auth.uid()) for update;
 if lead.id is null then raise exception 'Prospect not found' using errcode='22023';end if;
 select * into client from public.lunaria_records where kind='client' and owner_id=(select auth.uid()) and payload->>'sourceProspectId'=p_id;
 if client.id is not null then return jsonb_build_object('clientId',client.id,'existing',true);end if;
 if lead.version<>p_expected_version then raise exception 'This prospect changed in another session. Refresh and try again.' using errcode='P0001';end if;
 if lead.payload->>'stage'<>'Won' then raise exception 'Mark this deal Won before converting' using errcode='22023';end if;
 cid='client-'||p_id;
 body=jsonb_build_object('name',lead.payload->>'name','contact',coalesce(lead.payload->>'contact',''),'email',coalesce(lead.payload->>'email',''),'phone',coalesce(lead.payload->>'phone',''),'industry',coalesce(lead.payload->>'industry',''),'website',coalesce(lead.payload->>'website',''),'status','Onboarding','ownerId',coalesce(lead.payload->>'ownerId',''),'notes',coalesce(lead.payload->>'notes',''),'sourceProspectId',p_id);
 insert into public.lunaria_records(id,owner_id,kind,payload) values(cid,(select auth.uid()),'client',body);
 insert into public.lunaria_records(id,owner_id,kind,payload) values(gen_random_uuid()::text,(select auth.uid()),'activity',jsonb_build_object('title','Converted to client','detail',lead.payload->>'name','recordId',p_id,'prospectId',p_id,'clientId',cid,'actor',(select auth.jwt())->>'email'));
 return jsonb_build_object('clientId',cid,'existing',false);
end;$$;
revoke all on function public.lunaria_convert_prospect(text,integer) from public,anon;
grant execute on function public.lunaria_convert_prospect(text,integer) to authenticated;

