import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getPlan,putPlan} from '@/lib/plans';
import {z} from 'zod';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d=>!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d);
const numeric=z.string().refine(s=>s===''||(/^\d+(\.\d+)?$/.test(s)&&Number(s)<=1000));
const schema=z.object({date,base:z.enum(['home','london','off']),range:numeric,miles:numeric.refine(s=>s===''||Number(s)>0),reserve:numeric.refine(s=>s!==''),rangeDate:date.optional()});
export async function GET(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in required'},{status:401});const d=new URL(req.url).searchParams.get('date');if(!date.safeParse(d).success)return Response.json({error:'Invalid date'},{status:400});try{return Response.json({plan:await getPlan(user.userId,d!)},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Storage unavailable'},{status:503})}}
export async function POST(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in required'},{status:401});if(req.headers.get('Sec-Fetch-Site')==='cross-site')return Response.json({error:'Forbidden'},{status:403});try{const parsed=schema.safeParse(await req.json());if(!parsed.success)return Response.json({error:'Check the date and range values'},{status:400});await putPlan(user.userId,parsed.data.date,parsed.data);return Response.json({saved:true})}catch{return Response.json({error:'Could not save'},{status:503})}}
