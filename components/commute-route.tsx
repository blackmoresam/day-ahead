type Report={road?:string;longitude?:number;location?:string;description?:string;comments?:string;currentUpdate?:string;severity?:string;start?:string;end?:string};
type Roads={error?:string;items?:Report[];national_highways?:{configured?:boolean;message?:string;items?:Report[]}};
type State='clear'|'minor'|'major'|'unknown';

const stages=[{id:'kent',label:'A2 · Kent'},{id:'m2',label:'M2'},{id:'london',label:'A2 · London'},{id:'arrival',label:'North Greenwich'}] as const;

function morning(report:Report,date:string){
  const from=Date.parse(`${date}T05:00:00Z`),to=Date.parse(`${date}T10:00:00Z`);
  return (!report.start||Date.parse(report.start)<to)&&(!report.end||Date.parse(report.end)>from);
}
function stage(report:Report):typeof stages[number]['id']{
  const text=`${report.road||''} ${report.location||''} ${report.description||''}`.toLowerCase();
  if(/north greenwich|blackwall/.test(text))return 'arrival';
  if(report.road==='M2'||(!report.road&&/\bm2\b/.test(text)))return 'm2';
  if(typeof report.longitude==='number')return report.longitude>0.65?'kent':'london';
  return /canterbury|kent|dartford|bexley/.test(text)?'kent':'london';
}
function level(report:Report):State{
  const text=`${report.description||''} ${report.comments||''} ${report.currentUpdate||''} ${report.severity||''}`;
  return /severe|serious|major|carriageway closure|road closed|full closure|blocked/i.test(text)?'major':'minor';
}

export default function CommuteRoute({roads,date,loading}:{roads?:Roads;date:string;loading:boolean}){
  const national=roads?.national_highways;
  const nationalReady=!!national?.configured&&!/unavailable|failed/i.test(national.message||'');
  const londonReady=!!roads&&!roads.error;
  const states:Record<typeof stages[number]['id'],State>={kent:nationalReady?'clear':'unknown',m2:nationalReady?'clear':'unknown',london:londonReady?'clear':'unknown',arrival:londonReady?'clear':'unknown'};
  const reports=[...(national?.items||[]),...(roads?.items||[])];
  let later=0;
  for(const report of reports){
    const text=`${report.location||''} ${report.description||''} ${report.comments||''}`;
    if(/\beastbound\b/i.test(text)&&!/\bboth directions\b/i.test(text)){later++;continue}
    if(!morning(report,date)){later++;continue}
    const place=stage(report),severity=level(report);
    if(states[place]==='unknown'||severity==='major'||states[place]==='clear')states[place]=severity;
  }
  const values=Object.values(states);
  const headline=loading&&!roads?'Checking your route':values.includes('major')?'Severe disruption reported on your drive in':values.includes('minor')?'Some disruption reported on your drive in':values.every(x=>x==='unknown')?'Route status unavailable':values.includes('unknown')?'No issues reported on the checked sections':'No issues reported on your drive in';
  return <div className="commute-overview" aria-label={headline}>
    <div className="commute-summary"><strong>{headline}</strong><span>{later?`${later} later or return-journey report${later===1?'':'s'} listed below`:'Based on reported road incidents and closures'}</span></div>
    <div className="commute-endpoints"><span>Chartham</span><span>North Greenwich</span></div>
    <div className="commute-track" role="img" aria-label={stages.map(x=>`${x.label}: ${states[x.id]==='clear'?'no reported issues':states[x.id]==='minor'?'minor disruption':states[x.id]==='major'?'severe disruption':'status unavailable'}`).join('; ')}>
      {stages.map(x=><span key={x.id} className={`commute-segment ${states[x.id]}`}/>) }
    </div>
    <div className="commute-stages">{stages.map(x=><span key={x.id}>{x.label}</span>)}</div>
    <div className="commute-legend"><span><i className="clear"/>No reported issue</span><span><i className="minor"/>Minor report</span><span><i className="major"/>Severe disruption</span><span><i className="unknown"/>Unavailable</span></div>
    <p className="commute-source">Road reports do not include live traffic speeds. Check the full driving route for journey times.</p>
  </div>
}
