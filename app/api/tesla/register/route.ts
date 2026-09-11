import {env} from 'cloudflare:workers';
export async function GET(req:Request){
  const e=env as unknown as Record<string,unknown>, id=String(e.TESLA_CLIENT_ID||''), secret=String(e.TESLA_CLIENT_SECRET||'');
  if(!id||!secret)return Response.json({error:'Tesla credentials are not configured'},{status:503});
  const tokenBody=new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret,audience:'https://fleet-api.prd.eu.vn.cloud.tesla.com'});
  const tr=await fetch('https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody});
  if(!tr.ok)return Response.json({error:'Tesla partner token request failed',detail:await tr.text()},{status:502});
  const token:any=await tr.json();
  const domain=new URL(req.url).hostname;
  const rr=await fetch('https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts',{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({domain})});
  const detail=await rr.text();
  return new Response(detail,{status:rr.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
