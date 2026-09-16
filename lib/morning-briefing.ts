type Hourly={time?:string[];temperature_2m?:Array<number|null>;precipitation_probability?:Array<number|null>};
type RoadReport={description?:string;location?:string;comments?:string;start?:string;end?:string};
type Briefing={weather?:{home?:{hourly?:Hourly};work?:{hourly?:Hourly}};roads?:{error?:string;items?:RoadReport[];national_highways?:{configured?:boolean;message?:string;items?:RoadReport[]}}};

function weatherSummary(hourly:Hourly|undefined,name:string){
  const indices=(hourly?.time||[]).map((time,index)=>({hour:Number(time.slice(11,13)),index})).filter(x=>x.hour>=6&&x.hour<12).map(x=>x.index);
  const values=(series:Array<number|null>|undefined)=>indices.map(index=>series?.[index]).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));
  const temperatures=values(hourly?.temperature_2m),rain=values(hourly?.precipitation_probability);
  if(!temperatures.length)return `${name} weather unavailable`;
  const range=`${Math.round(Math.min(...temperatures))}–${Math.round(Math.max(...temperatures))}°C`;
  return `${name} ${range}${rain.length?`, rain up to ${Math.round(Math.max(...rain))}%`:''}`;
}

function morningBounds(date:string){
  const offsetName=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeZoneName:'shortOffset'}).formatToParts(Date.parse(`${date}T12:00:00Z`)).find(x=>x.type==='timeZoneName')?.value||'GMT';
  const offset=Number(offsetName.match(/GMT([+-]\d+)/)?.[1]||0);
  return [Date.parse(`${date}T06:00:00Z`)-offset*3600000,Date.parse(`${date}T10:00:00Z`)-offset*3600000];
}

function affectsMorning(report:RoadReport,date:string){
  const description=`${report.description||''} ${report.location||''} ${report.comments||''}`;
  if(/\beastbound\b/i.test(description)&&!/\bboth directions\b/i.test(description))return false;
  const [from,to]=morningBounds(date);
  return (!report.start||Date.parse(report.start)<to)&&(!report.end||Date.parse(report.end)>from);
}

export function morningNotification(briefing:Briefing|null,base:string,date:string){
  const home=weatherSummary(briefing?.weather?.home?.hourly,'Chartham');
  let body=home+'.';
  if(base==='london'){
    const work=weatherSummary(briefing?.weather?.work?.hourly,'Paddington');
    const national=briefing?.roads?.national_highways;
    const nationalReady=!!national?.configured&&!/unavailable|failed/i.test(national.message||'');
    const londonReady=!!briefing?.roads&&!briefing.roads.error;
    const reports=[...(national?.items||[]),...(briefing?.roads?.items||[])].filter(report=>affectsMorning(report,date));
    const road=reports.length?`${reports.length} reported road issue${reports.length===1?'':'s'}`:nationalReady&&londonReady?'no reported road issues':'road status partly unavailable';
    body=`${home}; ${work}. A2/M2: ${road}.`;
  }
  return {title:'Your 06:00 day-ahead briefing',body:`${body} Tap for details.`,url:`/?date=${date}`,tag:'day-ahead-morning'};
}
