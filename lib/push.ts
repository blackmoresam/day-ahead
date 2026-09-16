import {buildPushPayload,type PushSubscription} from '@block65/webcrypto-web-push';

export type PushEnv={DB:D1Database;DAY_AHEAD_VAPID_PUBLIC_KEY:string;DAY_AHEAD_VAPID_PRIVATE_KEY:string};

export async function ensurePushTables(db:D1Database){
  await db.prepare('CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription TEXT NOT NULL, created_at TEXT NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS push_deliveries (endpoint TEXT NOT NULL, local_date TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY (endpoint, local_date, kind))').run();
}

export async function sendPush(subscription:PushSubscription,env:PushEnv,kind:'evening'|'test'){
  const message=kind==='evening'
    ?{title:'Where are you based tomorrow?',body:'Open Day Ahead to choose London, home or a day off, and check your plans.',url:'/'}
    :{title:'Day Ahead notifications are ready',body:'Your iPhone can receive the 20:00 evening check-in.',url:'/'};
  const payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:3600}},subscription,{
    subject:'https://day-ahead-companion.samblackmore87.chatgpt.site',
    publicKey:env.DAY_AHEAD_VAPID_PUBLIC_KEY,
    privateKey:env.DAY_AHEAD_VAPID_PRIVATE_KEY,
  });
  const response=await fetch(subscription.endpoint,payload);
  return response.status;
}

export async function sendEveningPush(env:PushEnv,scheduledTime:number){
  const localHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(scheduledTime);
  if(localHour!=='20')return;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(scheduledTime);
  const get=(type:string)=>parts.find(part=>part.type===type)?.value||'';
  const localDate=`${get('year')}-${get('month')}-${get('day')}`;
  await ensurePushTables(env.DB);
  const rows=await env.DB.prepare('SELECT endpoint, subscription FROM push_subscriptions').all<{endpoint:string;subscription:string}>();
  for(const row of rows.results||[]){
    const sent=await env.DB.prepare('SELECT 1 FROM push_deliveries WHERE endpoint = ? AND local_date = ? AND kind = ?').bind(row.endpoint,localDate,'evening').first();
    if(sent)continue;
    try{
      const status=await sendPush(JSON.parse(row.subscription),env,'evening');
      if(status>=200&&status<300)await env.DB.prepare('INSERT OR IGNORE INTO push_deliveries (endpoint, local_date, kind) VALUES (?, ?, ?)').bind(row.endpoint,localDate,'evening').run();
      else if(status===404||status===410)await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run();
      else console.error('Web push delivery failed',status);
    }catch(error){console.error('Web push delivery failed',error instanceof Error?error.message:'Unknown error')}
  }
}
