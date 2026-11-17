import {z} from 'zod';
const text=z.string().trim().max(500),cents=z.number().int().min(0).max(10000000000);
const day=z.string().refine(v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v),'Enter a valid date');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const projectStates=['In progress','Completed','On hold','Archived'] as const;
export const payoutSchema=z.object({id:text.min(1),amountCents:cents.min(1),date:day.refine(Boolean,'Payment date required').refine(d=>d<=today(),'Payments cannot be dated in the future'),method:text.min(1,'Choose a payment method'),note:text});
export const projectSchema=z.object({name:text.min(1,'Project name is required'),clientId:text.min(1,'Choose a client'),chargeCents:cents.min(1,'Enter the client charge'),status:z.enum(projectStates),due:day,notes:z.string().trim().max(10000),allocations:z.array(z.object({id:text.min(1),teamId:text.min(1,'Choose a team member'),work:text,feeCents:cents,payments:z.array(payoutSchema).max(200)})).max(100)}).superRefine((p,ctx)=>{
 if(new Set(p.allocations.map(a=>a.teamId)).size!==p.allocations.length)ctx.addIssue({code:'custom',message:'Add each team member once per project'});
 if(new Set(p.allocations.map(a=>a.id)).size!==p.allocations.length)ctx.addIssue({code:'custom',message:'Duplicate team allocation'});
 const ids=p.allocations.flatMap(a=>a.payments.map(x=>x.id));if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate payment'});
 for(const a of p.allocations)if(a.payments.reduce((s,x)=>s+x.amountCents,0)>a.feeCents)ctx.addIssue({code:'custom',message:'Payments cannot exceed the agreed team fee'});
 if(p.allocations.reduce((s,a)=>s+a.feeCents,0)>10000000000)ctx.addIssue({code:'custom',message:'Total team fees are too large'});
});
export type Project=z.infer<typeof projectSchema>;
export type Allocation=Project['allocations'][number];
export const allocationPaid=(a:Allocation)=>a.payments.reduce((s,p)=>s+p.amountCents,0);
export function projectTotals(p:Project){const fees=p.allocations.reduce((s,a)=>s+a.feeCents,0),paid=p.allocations.reduce((s,a)=>s+allocationPaid(a),0),profit=p.chargeCents-fees;return {charge:p.chargeCents,fees,paid,due:fees-paid,profit,margin:p.chargeCents?profit/p.chargeCents*100:0};}
export function sumProjects(projects:Project[]){return projects.reduce((s,p)=>{const t=projectTotals(p);return {charge:s.charge+t.charge,fees:s.fees+t.fees,paid:s.paid+t.paid,due:s.due+t.due,profit:s.profit+t.profit};},{charge:0,fees:0,paid:0,due:0,profit:0});}
export function teamProjectTotals(projects:Project[],teamId:string){return projects.flatMap(p=>p.allocations).filter(a=>a.teamId===teamId).reduce((s,a)=>({fees:s.fees+a.feeCents,paid:s.paid+allocationPaid(a),due:s.due+a.feeCents-allocationPaid(a)}),{fees:0,paid:0,due:0});}
