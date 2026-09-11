import {env} from 'cloudflare:workers';
export function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('Database unavailable');return db;}
export async function getPlan(user:string,date:string){const row=await database().prepare('SELECT payload FROM plans WHERE user_id = ? AND date = ?').bind(user,date).first<{payload:string}>();return row?JSON.parse(row.payload):null;}
export async function putPlan(user:string,date:string,plan:unknown){await database().prepare('INSERT INTO plans (user_id, date, payload) VALUES (?, ?, ?) ON CONFLICT(user_id,date) DO UPDATE SET payload = excluded.payload').bind(user,date,JSON.stringify(plan)).run();}
