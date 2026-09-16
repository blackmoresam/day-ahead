import {env} from 'cloudflare:workers';
async function json(url:string,headers:Record<string,string>={}){const r=await fetch(url,{headers:{Accept:'application/json',...headers}});if(!r.ok)throw Error(`Provider unavailable (${r.status})`);return r.json();}
async function nationalHighways(date:string){
  const key=(env as unknown as Record<string,unknown>).NATIONAL_HIGHWAYS_SUBSCRIPTION_KEY;
  if(typeof key!=='string'||!key)return {configured:false,items:[],message:'National Highways access key not configured'};
  try{
    const q=new URLSearchParams({startDateTime:`${date}T00:00:00`,endDateTime:`${date}T23:59:59`});
    const response=await fetch(`https://api.data.nationalhighways.co.uk/roads/v2.0/closures?${q}`,{headers:{Accept:'application/xml','Ocp-Apim-Subscription-Key':key}});
    if(!response.ok)throw Error(`National Highways feed unavailable (${response.status})`);
    const xml=await response.text();
    if(!xml.includes('<D2Payload>'))throw Error('Unexpected National Highways response');
    const field=(record:string,name:string)=>record.match(new RegExp(`<${name}>([^<]*)<\\/${name}>`))?.[1]?.trim()||'';
    const decode=(value:string)=>value.replace(/&(?:amp|lt|gt|quot|apos|#(\d+));/g,(match,code:string)=>code?String.fromCharCode(Number(code)):({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[match]||match));
    const items=[];
    for(const match of xml.matchAll(/<situation>([\s\S]*?)<\/situation>/g)){
      const record=match[1];
      const road=record.match(/<roadName>(A2|M2)<\/roadName>/)?.[1];
      if(!road||field(record,'validityStatus')==='suspended')continue;
      const start=field(record,'overallStartTime');
      const end=field(record,'overallEndTime');
      if((start&&start>=`${date}T22:00:00Z`)||(end&&end<=`${date}T05:00:00Z`))continue;
      // The feed covers the whole country. Keep only the Chartham–North Greenwich corridor.
      const onRoute=[...record.matchAll(/<posList>([^<]+)<\/posList>/g)].some((position)=>{
        const points=position[1].trim().split(/\s+/).map(Number);
        for(let i=0;i+1<points.length;i+=2)if(points[i]>=51.2&&points[i]<=51.55&&points[i+1]>=-0.05&&points[i+1]<=1.08)return true;
        return false;
      });
      if(!onRoute)continue;
      const location=decode(field(record,'locationDescription'));
      const description=decode(field(record,'comment'));
      const localTime=(value:string)=>new Date(value).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      const timing=start&&end?` (${localTime(start)}–${localTime(end)})`:'';
      items.push({road,location:location||road,description:`${description||'Closure or restriction reported'}${timing}`,start,end,status:field(record,'validityStatus')});
    }
    return {configured:true,items:items.slice(0,30),message:items.length?'':'No reported A2 / M2 closures on your route during the travel day.'};
  }catch(e){return {configured:true,items:[],message:e instanceof Error?e.message:'National Highways feed unavailable'}}
}
async function weather(lat:number,lon:number,date:string){try{return await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code&wind_speed_unit=mph&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&start_date=${date}&end_date=${date}`)}catch(e){return {error:e instanceof Error?e.message:'Weather provider unavailable'}}}
export async function GET(req:Request){const date=new URL(req.url).searchParams.get('date')||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date)))return Response.json({error:'Invalid date'},{status:400});const tubeUrl='https://api.tfl.gov.uk/Line/jubilee,circle,hammersmith-city/Status?detail=true';
const [home,work,tube,roads,national]=await Promise.all([weather(51.257,1.018,date),weather(51.5154,-0.1755,date),json(tubeUrl).then(lines=>Array.isArray(lines)?{lines}:{error:'Tube status unavailable'}).catch(()=>({error:'TfL status unavailable. Check the TfL link for updates.'})),json('https://api.tfl.gov.uk/Road/all/Disruption').then(items=>{if(!Array.isArray(items))return {error:'London route reports unavailable'};const active=items.filter((r:any)=>(!r.startDateTime||r.startDateTime.slice(0,10)<=date)&&(!r.endDateTime||r.endDateTime.slice(0,10)>=date));const routeText=(r:any)=>JSON.stringify(r).toLowerCase();const routeItems=active.filter((r:any)=>(/(^|[^a-z0-9])a\\s*2([^a-z0-9]|$)|(^|[^a-z0-9])m\\s*2([^a-z0-9]|$)|north greenwich|dartford crossing|blackwall/).test(routeText(r)));const reroutes=active.filter((r:any)=>!routeItems.includes(r)&&/(severe|serious|major|closure|closed|diversion|blocked|incident|collision)/i.test(`${r.severity} ${r.category} ${r.comments} ${r.currentUpdate}`));const shape=(r:any)=>({location:r.location,category:r.category,comments:r.comments,currentUpdate:r.currentUpdate,severity:r.severity});return {route:'A2 → M2 → North Greenwich',items:routeItems.map(shape),reroutes:reroutes.slice(0,10).map(shape)};}).catch(()=>({error:'London route reports unavailable.'})),nationalHighways(date)]);return Response.json({weather:{home,work},tube,roads:{...roads,national_highways:national},checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}



