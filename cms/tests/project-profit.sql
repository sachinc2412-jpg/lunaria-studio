begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.lunaria_admins limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare pr jsonb; allocation jsonb; result jsonb; rejected boolean; saved jsonb; day text=(now() at time zone 'Asia/Dubai')::date::text;
begin
 perform public.lunaria_save_record('qa-project-client','client','{"name":"QA Project Client"}'::jsonb,null);
 perform public.lunaria_save_record('qa-project-team','team','{"name":"QA Project Member"}'::jsonb,null);
 allocation=jsonb_build_object('id','a1','teamId','qa-project-team','work','Design','feeCents',20000,'payments',jsonb_build_array(jsonb_build_object('id','p1','amountCents',5000,'date',day,'method','Bank transfer','note','')));
 pr=jsonb_build_object('name','QA Project','clientId','qa-project-client','chargeCents',50000,'status','In progress','due','','notes','','allocations',jsonb_build_array(allocation));
 result=public.lunaria_save_record('qa-project-ledger','project',pr,null);
 if result->>'version'<>'1' then raise exception 'Create failed';end if;
 allocation=jsonb_set(allocation,'{payments}',(allocation->'payments')||jsonb_build_array(jsonb_build_object('id','p2','amountCents',15000,'date',day,'method','Cash','note','Final')));
 pr=jsonb_set(pr,'{allocations}',jsonb_build_array(allocation));
 result=public.lunaria_save_record('qa-project-ledger','project',pr,1);
 if result->>'version'<>'2' then raise exception 'Partial payout update failed';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',pr,1);exception when sqlstate 'P0001' then rejected=true;end;if not rejected then raise exception 'Stale update accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations,0,feeCents}','19999'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Overpayment accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations,0,payments,0,amountCents}','4999'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Payment edit accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations}','[]'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Paid allocation removal accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations,0,teamId}','"not-owned-team"'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Foreign team reference accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations}',jsonb_build_array(allocation,allocation)),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Duplicate team accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations,0,payments,1,id}','"p1"'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Duplicate payout accepted';end if;
 rejected=false;begin perform public.lunaria_save_record('qa-project-ledger','project',jsonb_set(pr,'{allocations,0,payments,1,date}','"2099-01-01"'),2);exception when sqlstate '22023' then rejected=true;end;if not rejected then raise exception 'Future payout accepted';end if;
 if not exists(select 1 from public.lunaria_records where id='qa-project-ledger' and version=2) then raise exception 'Rejected updates changed record';end if;
end;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
do $$ declare rejected boolean=false;begin
 if exists(select 1 from public.lunaria_records where id='qa-project-ledger') then raise exception 'Cross-owner read allowed';end if;
 begin perform public.lunaria_save_record('qa-unauthorized','project','{}',null);exception when insufficient_privilege then rejected=true;end;
 if not rejected then raise exception 'Non-admin write allowed';end if;
end;$$;
select 'passed: create, partial payout, stale update, overpayment, immutable history, ownership, duplicate allocation/payment, future date, RLS and non-admin denial; rolled back' as project_validation;
rollback;
