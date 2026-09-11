import {env} from 'cloudflare:workers';
export async function GET(req:Request){
  const e=env as unknown as Record<string,unknown>;
  const id=String(e.TESLA_CLIENT_ID||'');
  if(!id)return Response.json({error:'Tesla is not configured'},{status:503});
  const u=new URL('https://auth.tesla.com/oauth2/v3/authorize');
  u.searchParams.set('client_id',id);u.searchParams.set('response_type','code');
  u.searchParams.set('redirect_uri',new URL('/api/tesla/callback',req.url).toString());
  u.searchParams.set('scope','openid offline_access user_data vehicle_device_data');
  u.searchParams.set('state','day-ahead');
  return Response.redirect(u.toString(),302);
}
