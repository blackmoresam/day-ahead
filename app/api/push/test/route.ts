import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {ensurePushTables,sendPush,type PushEnv} from '@/lib/push';

export async function POST(req:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in required'},{status:401});
  if(req.headers.get('Sec-Fetch-Site')==='cross-site')return Response.json({error:'Forbidden'},{status:403});
  const endpoint=((await req.json().catch(()=>null)) as {endpoint?:unknown}|null)?.endpoint;
  if(typeof endpoint!=='string')return Response.json({error:'Missing subscription'},{status:400});
  try{
    const bindings=env as unknown as PushEnv;
    await ensurePushTables(bindings.DB);
    const row=await bindings.DB.prepare('SELECT subscription FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint,user.userId).first<{subscription:string}>();
    if(!row)return Response.json({error:'Phone not subscribed'},{status:404});
    const status=await sendPush(JSON.parse(row.subscription),bindings,'test');
    if(status<200||status>=300)return Response.json({error:`Push provider rejected the test (${status})`},{status:502});
    return Response.json({sent:true});
  }catch{return Response.json({error:'Could not send a test notification'},{status:503})}
}
