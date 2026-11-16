import {workspaceClient,AccessError} from '../../../../lib/supabase-server';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Origin not allowed'},403);
  const {sb}=await workspaceClient(request);const raw=await request.text();if(raw.length>1000)return reply({error:'Request too large'},413);
  const {id,version}=JSON.parse(raw);if(typeof id!=='string'||id.length>100||!Number.isInteger(version)||version<1)return reply({error:'Invalid prospect'},400);
  const {data,error}=await sb.rpc('lunaria_convert_prospect',{p_id:id,p_expected_version:version});
  if(error){if(error.code==='P0001')return reply({error:error.message},409);if(error.code==='22023')return reply({error:error.message},400);throw error;}
  return reply(data);
 }catch(e){return e instanceof AccessError?reply({error:e.message},e.status):e instanceof SyntaxError?reply({error:'Invalid request'},400):reply({error:'Could not convert this prospect. Please retry.'},503);}
}
