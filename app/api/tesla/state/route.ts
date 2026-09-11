import {env} from 'cloudflare:workers';
export async function GET(req:Request){
  const m=req.headers.get('cookie')?.match(/(?:^|; )tesla_access=([^;]+)/); if(!m)return Response.json({connected:false});
  const r=await fetch('https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/vehicles',{headers:{Authorization:`Bearer ${decodeURIComponent(m[1])}`,Accept:'application/json'}});
  if(!r.ok){const detail=await r.text();let message=`Tesla vehicle data unavailable (${r.status})`;try{const parsed=JSON.parse(detail);message=parsed.error_description||parsed.error||message}catch{}return Response.json({connected:false,error:message,status:r.status},{status:502});}
  const raw:any=await r.json(), v=raw.response?.[0]; if(!v)return Response.json({connected:true,vehicle:null});
  const vehicleKey=v.vin||v.id_s||v.id; const d=await fetch(`https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/vehicles/${encodeURIComponent(vehicleKey)}/vehicle_data`,{headers:{Authorization:`Bearer ${decodeURIComponent(m[1])}`,Accept:'application/json'}});
  const detail:any=d.ok?await d.json():{}; if(!d.ok)return Response.json({connected:true,vehicle:{id:v.id,name:v.display_name||v.vehicle_name,state:v.state},error:`Tesla vehicle data unavailable (${d.status})`}); const car=detail.response||v, charge=car.charge_state||{};
  if(charge.battery_level==null)return Response.json({connected:true,vehicle:{id:v.id,name:v.display_name||v.vehicle_name,state:v.state},error:'Tesla returned no current charge data. The vehicle may be asleep or unavailable.'});
  return Response.json({connected:true,vehicle:{id:v.id,name:v.display_name||v.vehicle_name||car.vehicle_state?.vehicle_name,state:v.state,chargeLevel:charge.battery_level,rangeMiles:charge.battery_range}});
}
