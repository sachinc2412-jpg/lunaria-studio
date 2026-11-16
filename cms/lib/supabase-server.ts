import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config';
export class AccessError extends Error {constructor(message:string,public status=401){super(message);}}
export async function workspaceClient(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)throw new AccessError('Please sign in to your Lunaria account.');
 const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)throw new AccessError('Your session has expired. Please sign in again.');
 const {data:admin,error:adminError}=await sb.from('lunaria_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)throw new AccessError('Could not verify workspace access. Please retry.',503);
 if(!admin)throw new AccessError('This account does not have access to the Lunaria workspace.',403);
 return {sb,user};
}
