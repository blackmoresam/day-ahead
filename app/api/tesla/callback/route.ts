import {env} from 'cloudflare:workers';
export async function GET(req:Request){
  const q=new URL(req.url).searchParams, code=q.get('code');
  if(!code)return new Response('Tesla authorisation was cancelled.',{status:400});
  const e=env as unknown as Record<string,unknown>, id=String(e.TESLA_CLIENT_ID||''), secret=String(e.TESLA_CLIENT_SECRET||'');
  const body=new URLSearchParams({grant_type:'authorization_code',client_id:id,client_secret:secret,code,redirect_uri:new URL('/api/tesla/callback',req.url).toString()});
  const r=await fetch('https://fleet-auth.prd.eu.ia.tesla.com/oauth2/v3/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!r.ok)return new Response('Tesla token exchange failed.',{status:502});
  const token:any=await r.json();
  const h=new Headers({Location:'/?tesla=connected'});h.append('Set-Cookie',`tesla_access=${encodeURIComponent(token.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.min(Number(token.expires_in||3600),86400)}`);
  return new Response(null,{status:302,headers:h});
}
