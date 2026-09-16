import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {ensurePushTables,type PushEnv} from '@/lib/push';
import {z} from 'zod';

const subscriptionSchema=z.object({
  endpoint:z.string().url().max(2048).refine(value=>{
    const url=new URL(value);
    return url.protocol==='https:'&&['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(url.hostname);
  }),
  expirationTime:z.number().nullable().optional(),
  keys:z.object({p256dh:z.string().min(40).max(200),auth:z.string().min(12).max(100)}),
});

export async function GET(){
  const publicKey=(env as unknown as PushEnv).DAY_AHEAD_VAPID_PUBLIC_KEY;
  return Response.json({available:!!publicKey,publicKey:publicKey||null},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in to enable notifications'},{status:401});
  if(req.headers.get('Sec-Fetch-Site')==='cross-site')return Response.json({error:'Forbidden'},{status:403});
  const parsed=subscriptionSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'Invalid phone subscription'},{status:400});
  try{
    const db=(env as unknown as PushEnv).DB;
    await ensurePushTables(db);
    const subscription={...parsed.data,expirationTime:parsed.data.expirationTime??null};
    await db.prepare('INSERT INTO push_subscriptions (endpoint, user_id, subscription, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, subscription = excluded.subscription').bind(subscription.endpoint,user.userId,JSON.stringify(subscription),new Date().toISOString()).run();
    return Response.json({enabled:true});
  }catch{return Response.json({error:'Could not save the phone subscription'},{status:503})}
}

export async function DELETE(req:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:'Sign in required'},{status:401});
  if(req.headers.get('Sec-Fetch-Site')==='cross-site')return Response.json({error:'Forbidden'},{status:403});
  const endpoint=((await req.json().catch(()=>null)) as {endpoint?:unknown}|null)?.endpoint;
  if(typeof endpoint!=='string')return Response.json({error:'Missing subscription'},{status:400});
  try{
    const db=(env as unknown as PushEnv).DB;
    await ensurePushTables(db);
    await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint,user.userId).run();
    return Response.json({enabled:false});
  }catch{return Response.json({error:'Could not remove the phone subscription'},{status:503})}
}
