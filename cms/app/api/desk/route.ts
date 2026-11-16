import { schemas, kinds, type Kind } from '../../../lib/model';
import { workspaceClient, AccessError } from '../../../lib/supabase-server';
export const dynamic='force-dynamic';
const reply=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 try {
  const {sb,user}=await workspaceClient(request);
  // Paginate the Data API to avoid its default 1,000-row limit silently hiding clients.
  const rows:any[]=[];
  for(let offset=0;;offset+=500){
   const {data,error}=await sb.from('lunaria_records').select('id,kind,payload,version,created_at,updated_at').eq('owner_id',user.id).order('updated_at',{ascending:false}).order('id').range(offset,offset+499);
   if(error)throw error;rows.push(...data);if(data.length<500)break;
  }
  return reply({records:rows.map(r=>({id:r.id,kind:r.kind,data:r.payload,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at})),email:user.email});
 }catch(e){return e instanceof AccessError?reply({error:e.message},e.status):reply({error:'Could not load your workspace. Please retry.'},503);}
}
export async function POST(request:Request){
 try {
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origin not allowed'},403);
  const {sb}=await workspaceClient(request);
  if(Number(request.headers.get('content-length')||0)>150000)return reply({error:'Request too large'},413);
  const raw=await request.text();if(raw.length>150000)return reply({error:'Request too large'},413);
  const body=JSON.parse(raw),kind=body.kind as Kind;
  if(!kinds.includes(kind))return reply({error:'Unknown record type'},400);
  const result=schemas[kind].safeParse(body.data);
  if(!result.success)return reply({error:result.error.issues.map(i=>i.message).join('. ')},400);
  const id=body.id||(kind==='settings'?'workspace-settings':crypto.randomUUID());
  if(typeof id!=='string'||id.length>100)return reply({error:'Invalid record'},400);
  if(body.id&&(!Number.isInteger(body.version)||body.version<1))return reply({error:'Refresh this record and try again.'},400);
  const {data,error}=await sb.rpc('lunaria_save_record',{p_id:id,p_kind:kind,p_payload:result.data,p_expected_version:body.id?body.version:null});
  if(error){
   if(error.code==='40001'||error.code==='P0001'&&error.message.includes('changed in another session'))return reply({error:'This record changed in another session. Refresh and try again.'},409);
   if(error.code==='23505')return reply({error:kind==='invoice'?'Invoice number already exists.':'This record already exists. Refresh and try again.'},409);
   if(error.code==='22023')return reply({error:error.message},400);
   if(error.code==='42501')return reply({error:'Admin access required.'},403);
   throw error;
  }
  return reply({record:data});
 }catch(e){return e instanceof AccessError?reply({error:e.message},e.status):e instanceof SyntaxError?reply({error:'Invalid request'},400):reply({error:'Could not save this record. Please retry.'},503);}
}
