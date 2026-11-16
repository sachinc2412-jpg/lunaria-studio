import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {quoteTotals,type Quotation} from './sales-model';
const money=(c:number)=>new Intl.NumberFormat('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(c/100);
const labelDate=(d:string)=>d?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z')):'';
export async function buildQuotationPdf(q:Quotation,logoBytes:Uint8Array,fontBytes:Uint8Array){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:true}),logo=await doc.embedPng(logoBytes);
 const W=595.28,H=841.89,L=46,R=549.28,ink=rgb(.14,.16,.19),gray=rgb(.47,.50,.55),orange=rgb(.95,.40,.11),line=rgb(.90,.92,.94);let page!:PDFPage,y=0;
 const clean=(s:string)=>String(s??'').replace(/\t/g,'  ').replace(/\r/g,'');
 const width=(s:string,size:number)=>font.widthOfTextAtSize(clean(s),size);
 const put=(s:string,x:number,top:number,size=10,color=ink)=>page.drawText(clean(s),{x,y:H-top-size,size,font,color});
 function fresh(){page=doc.addPage([W,H]);page.drawRectangle({x:0,y:H-6,width:W,height:6,color:orange});page.drawImage(logo,{x:L,y:H-78,width:91,height:49});put('QUOTATION',R-104,40,8,gray);put(q.number,R-width(q.number,8),57,8,gray);y=108;}
 function ensure(h:number){if(y+h>H-66)fresh();}
 function wrapped(text:string,max:number,size:number){const result:string[]=[];for(const paragraph of clean(text).split('\n')){if(!paragraph){result.push('');continue;}let row='';for(const word of paragraph.split(/\s+/)){if(width(word,size)>max){if(row){result.push(row);row='';}let part='';for(const c of word){if(width(part+c,size)>max&&part){result.push(part);part='';}part+=c;}row=part;}else if(width(row?(row+' '+word):word,size)>max){result.push(row);row=word;}else row=row?row+' '+word:word;}if(row)result.push(row);}return result;}
 function paragraph(text:string,size=10,color=ink,max=R-L,x=L){for(const row of wrapped(text,max,size)){ensure(size+9);if(row)put(row,x,y,size,color);y+=size+7;}y+=5;}
 function section(title:string){ensure(55);y+=13;put(title.toUpperCase(),L,y,9,orange);y+=20;page.drawLine({start:{x:L,y:H-y},end:{x:R,y:H-y},thickness:.6,color:line});y+=14;}
 function numbered(text:string){const lines=clean(text).split('\n').filter(x=>x.trim());let n=0;for(const item of lines){n++;const rows=wrapped(item.replace(/^\s*(?:\d+[.)]|[•*-])\s*/,''),R-L-24,10);for(let i=0;i<rows.length;i++){ensure(20);if(i===0)put(String(n).padStart(2,'0'),L,y,8,gray);put(rows[i],L+24,y,10);y+=17;}y+=7;}}
 fresh();paragraph(q.title,27,ink);y+=5;put('PREPARED FOR',L,y,8,gray);put('ISSUED',355,y,8,gray);y+=17;paragraph(q.company,15,ink,290);const nameEnd=y;put(labelDate(q.issued),355,nameEnd-25,10);put('VALID UNTIL',355,nameEnd-2,8,gray);put(labelDate(q.validUntil),355,nameEnd+13,10);for(const s of [q.contact,q.location,q.email,q.phone].filter(Boolean))paragraph(s,9,gray,290);y=Math.max(y,nameEnd+42)+8;
 if(q.deliverables){section('Deliverables');numbered(q.deliverables);}
 if(q.support){section('Services & support');numbered(q.support);}
 if(q.timeline||q.revisions){section('Project details');if(q.timeline)paragraph('Delivery: '+q.timeline);if(q.revisions)paragraph('Revisions: '+q.revisions);}
 section('Investment');
 const tableHead=()=>{ensure(40);page.drawRectangle({x:L,y:H-y-25,width:R-L,height:25,color:rgb(.96,.97,.98)});put('DESCRIPTION',L+10,y+7,8,gray);put('QTY',326,y+7,8,gray);put('RATE · AED',365,y+7,8,gray);put('TOTAL · AED',465,y+7,8,gray);y+=38;};tableHead();
 for(const item of q.items){const rows=wrapped(item.description,253,10);if(y+rows.length*16+15>H-66){fresh();section('Investment · continued');tableHead();}for(let i=0;i<rows.length;i++){ensure(19);put(rows[i],L+10,y,10);if(i===0){put(String(item.quantity),326,y,9);put(money(item.rateCents),436-width(money(item.rateCents),9),y,9);put(money(item.rateCents*item.quantity),R-10-width(money(item.rateCents*item.quantity),9),y,9);}y+=16;}y+=11;page.drawLine({start:{x:L,y:H-y},end:{x:R,y:H-y},thickness:.5,color:line});y+=12;}
 const totals=quoteTotals(q);ensure(120);for(const [title,value] of [['Subtotal',totals.subtotal],...(totals.discount?[['Discount',-totals.discount]]:[]),...(q.taxBps?[['Tax ('+(q.taxBps/100)+'%)',totals.tax]]:[])] as [string,number][]){put(title,330,y,10,gray);put(money(value),R-width(money(value),10),y,10);y+=22;}
 page.drawRectangle({x:316,y:H-y-43,width:R-316,height:43,color:rgb(1,.95,.91)});put('TOTAL · AED',330,y+13,9,orange);put(money(totals.total),R-12-width(money(totals.total),16),y+9,16,ink);y+=62;
 if(q.milestones.length){section('Payment schedule');for(const m of q.milestones){const rows=wrapped(m.label,330,10);ensure(rows.length*17+10);rows.forEach((s,i)=>{put(s,L,y,10);if(i===0)put('AED '+money(m.amountCents),R-width('AED '+money(m.amountCents),10),y,10);y+=17;});y+=9;}}
 if(q.exclusions){section('Exclusions');paragraph(q.exclusions,9,gray);}
 if(q.terms){fresh();section('Terms & conditions');paragraph(q.terms,9,ink);}
 if(q.preparedBy||q.sender.email||q.sender.phone){section('Your contact');if(q.preparedBy)paragraph(q.preparedBy,11);for(const s of [q.sender.studio,q.sender.email,q.sender.phone,q.sender.address].filter(Boolean))paragraph(s,9,gray);}
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:L,y:43},end:{x:R,y:43},thickness:.5,color:line});p.drawText(clean(q.sender.studio),{x:L,y:27,size:8,font,color:gray});const footer=q.number+'  /  '+(i+1)+' of '+pages.length;p.drawText(footer,{x:R-width(footer,8),y:27,size:8,font,color:gray});});
 doc.setTitle(q.title+' — '+q.number);doc.setAuthor(q.sender.studio);doc.setSubject('Quotation for '+q.company);return doc.save();
}
