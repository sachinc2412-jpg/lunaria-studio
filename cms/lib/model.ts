import { z } from 'zod';
const str = z.string().trim().max(500);
const date = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10) === v), 'Enter a valid date');
const money = z.number().int().min(0).max(10000000000);
export const kinds = ['client','service','invoice','task','team','settings'] as const;
export type Kind = typeof kinds[number];
export const schemas = {
 client: z.object({name:str.min(1),contact:str,email:z.union([z.literal(''),z.string().email().max(250)]),phone:str,industry:str,website:str,status:z.enum(['Active','Onboarding','Paused','Prospect','Archived']),ownerId:str,notes:z.string().max(10000)}),
 service: z.object({clientId:str.min(1),name:str.min(1),feeCents:money,billing:z.enum(['Monthly','Quarterly','Annual','One-off']),ownerId:str,status:z.enum(['Active','Paused','Completed']),start:date,end:date,scope:z.string().max(10000)}).refine(v=>!v.start||!v.end||v.end>=v.start,'End date must follow the start date'),
 invoice: z.object({clientId:str.min(1),number:str.min(1),description:str.min(1),amountCents:money.min(1),issued:date.refine(Boolean,'Issue date required'),due:date.refine(Boolean,'Due date required'),void:z.boolean(),payments:z.array(z.object({id:str.min(1),amountCents:money.min(1),date:date.refine(Boolean,'Payment date required'),method:str.min(1),note:str})).max(500)}).refine(v=>v.payments.reduce((s,p)=>s+p.amountCents,0)<=v.amountCents,'Payments cannot exceed invoice total').refine(v=>!v.void||!v.payments.length,'An invoice with payments cannot be voided').refine(v=>v.due>=v.issued,'Due date must follow the issue date').refine(v=>new Set(v.payments.map(p=>p.id)).size===v.payments.length,'Duplicate payment'),
 task: z.object({title:str.min(1),clientId:str,ownerId:str,due:date,priority:z.enum(['Low','Medium','High']),status:z.enum(['To do','In progress','Done']),notes:z.string().max(10000)}),
 team: z.object({name:str.min(1),role:str,position:str.optional().default(''),email:z.union([z.literal(''),z.string().email().max(250)]),status:z.enum(['Active','Inactive'])}),
 settings: z.object({targetCents:money,studio:str.min(1),email:z.union([z.literal(''),z.string().email().max(250)]),phone:str,address:str})
};
export type RecordItem = { id:string; kind:Kind|'activity'; data:any; version:number; createdAt:string; updatedAt:string };
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const paid = (i:any) => i.payments.reduce((s:number,p:any)=>s+p.amountCents,0);
export const balance = (i:any) => i.void ? 0 : i.amountCents-paid(i);
export const invoiceStatus = (i:any, day=today()) => i.void ? 'Void' : !balance(i) ? 'Paid' : i.due < day ? 'Overdue' : paid(i)>0 ? 'Partial' : 'Unpaid';
export const monthly = (s:any,day=today()) => s.status!=='Active'||s.start&&s.start>day||s.end&&s.end<day ? 0 : s.billing==='Monthly'?s.feeCents:s.billing==='Quarterly'?s.feeCents/3:s.billing==='Annual'?s.feeCents/12:0;
export const amount = (c:number) => new Intl.NumberFormat('en-AE',{minimumFractionDigits: c%100?2:0,maximumFractionDigits:2}).format(c/100);
export const dateLabel = (s:string) => s?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z')):'—';
