import {env} from 'cloudflare:workers';
export async function GET(req:Request){
  const m=req.headers.get('cookie')?.match(/(?:^|; )tesla_access=([^;]+)/); if(!m)return Response.json({connected:false});
  const r=await fetch('https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/vehicles',{headers:{Authorization:`Bearer ${decodeURIComponent(m[1])}`,Accept:'application/json'}});
  if(!r.ok)return Response.json({connected:false,error:`Tesla vehicle data unavailable (${r.status})`},{status:502});
  const raw:any=await r.json(), v=raw.response?.[0]; if(!v)return Response.json({connected:true,vehicle:null});
  return Response.json({connected:true,vehicle:{id:v.id,name:v.display_name||v.vehicle_name,state:v.state,chargeLevel:v.charge_state?.battery_level,rangeMiles:v.charge_state?.battery_range}});
}
