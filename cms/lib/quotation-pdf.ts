import {PDFDocument,rgb,StandardFonts,setTextRenderingMode,TextRenderingMode,setLineWidth,setStrokingRgbColor,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {quoteTotals,quotationTerms,type Quotation} from './sales-model';
const money=(c:number)=>new Intl.NumberFormat('en-AE',{minimumFractionDigits:c%100?2:0,maximumFractionDigits:2}).format(c/100);
const date=(d:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'));
/** Retain the supplied cover and company profile verbatim; variable pages follow its design. */
export async function buildQuotationPdf(q:Quotation,logoBytes:Uint8Array,fontBytes:Uint8Array,referenceBytes:Uint8Array){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const reference=await PDFDocument.load(referenceBytes);
 for(const p of await doc.copyPages(reference,[0,1,2]))doc.addPage(p);
 const font=await doc.embedFont(fontBytes,{subset:true}),bold=await doc.embedFont(fontBytes,{subset:true}),italic=await doc.embedFont(StandardFonts.HelveticaOblique),logo=await doc.embedPng(logoBytes);
 const W=595.28,H=841.89,L=59.5,R=535.8,black=rgb(0,0,0),orange=rgb(1,.435,0),gray=rgb(.45,.45,.45);let page:PDFPage,y=0;
 const clean=(s:string)=>String(s??'').replace(/\t/g,'  ').replace(/\r/g,'');
 const width=(s:string,size:number,f=font)=>f.widthOfTextAtSize(clean(s),size);
 function put(s:string,x:number,top:number,size=10,f=font,color=black){if(f===bold)page.pushOperators(setTextRenderingMode(TextRenderingMode.FillAndOutline),setLineWidth(.22),setStrokingRgbColor(color.red,color.green,color.blue));page.drawText(clean(s),{x,y:H-top-size,size,font:f,color});if(f===bold)page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));}
 function wrap(text:string,max:number,size:number,f=font){const rows:string[]=[];for(const para of clean(text).split('\n')){if(!para.trim()){rows.push('');continue;}let row='';for(const word of para.trim().split(/\s+/)){if(width(word,size,f)>max){if(row){rows.push(row);row='';}let part='';for(const char of word){if(width(part+char,size,f)>max&&part){rows.push(part);part='';}part+=char;}row=part;}else if(row&&width(row+' '+word,size,f)>max){rows.push(row);row=word;}else row=row?row+' '+word:word;}if(row)rows.push(row);}return rows;}
 function fresh(showLogo=true){page=doc.addPage([W,H]);if(showLogo)page.drawImage(logo,{x:487,y:H-60,width:49,height:27});y=82;}
 function ensure(h:number){if(y+h>H-52)fresh();}
 function paragraph(text:string,size=10,max=R-L,x=L,f=font,color=black,leading=size*1.42){for(const row of wrap(text,max,size,f)){ensure(leading);if(row)put(row,x,y,size,f,color);y+=leading;}y+=3;}
 function centered(text:string,size:number,f=font){for(const row of wrap(text,R-L,size,f)){ensure(size*1.4);put(row,(W-width(row,size,f))/2,y,size,f);y+=size*1.4;}y+=4;}
 function section(title:string){ensure(65);y+=10;page.drawRectangle({x:L,y:H-y-33,width:R-L,height:33,color:orange});put(title.toUpperCase(),L+19,y+2,23,bold,rgb(1,1,1));y+=36;}
 function numbered(text:string){let n=0;for(const item of text.split('\n').filter(x=>x.trim())){const rows=wrap(item.replace(/^\s*(?:\d+[.)]|[•*-])\s*/,''),R-L-38,10);n++;for(let i=0;i<rows.length;i++){ensure(17);if(i===0)put(n+'.',L+19,y,10);put(rows[i],L+34,y,10);y+=15;}y+=1;}}
 fresh();centered('Quotation for a Customized',16);centered(q.title,22,bold);y+=5;
 paragraph('To,',11,R-L,L+19,italic);paragraph([q.company,q.location].filter(Boolean).join(', '),12,R-L-19,L+19,bold);
 const details=[q.contact,q.email,q.phone].filter(Boolean).join('  |  ');if(details)paragraph(details,9,R-L-19,L+19);
 paragraph(q.number+'  |  '+date(q.issued)+'  |  Valid until '+date(q.validUntil),8,R-L-19,L+19,font,gray);
 if(q.deliverables){section('Deliverables');numbered(q.deliverables);}
 if(q.support){section('Services & support');numbered(q.support);}
 if(q.timeline||q.revisions){ensure(75);y+=10;if(q.timeline)paragraph('Delivery timeline: '+q.timeline,10,R-L-38,L+19);if(q.revisions)paragraph('Included revisions: '+q.revisions,10,R-L-38,L+19);}
 section('Pricing');const totals=quoteTotals(q);
 if(q.items.length>1){for(const item of q.items){paragraph(item.description,10,R-L-38,L+19);paragraph(`${item.quantity} × AED ${money(item.rateCents)} = AED ${money(item.quantity*item.rateCents)}`,9,R-L-38,L+19,font,gray);}}
 ensure(70);put('Total Project Cost:',L+11,y,12,bold);const total='AED '+money(totals.total);put(total,R-55-width(total,12,bold),y,12,bold);y+=25;
 if(q.items.length===1){paragraph(q.items[0].description,9,R-L-38,L+19);paragraph(`Qty: ${q.items[0].quantity}  |  Rate: AED ${money(q.items[0].rateCents)}`,9,R-L-38,L+19,font,gray);}
 if(totals.discount||q.taxBps)paragraph(`Subtotal: AED ${money(totals.subtotal)}${totals.discount?'  |  Discount: AED '+money(totals.discount):''}${q.taxBps?'  |  Tax ('+(q.taxBps/100)+'%): AED '+money(totals.tax):''}`,9,R-L-38,L+19);
 centered('The above price is inclusive of the agreed development, implementation, integration, and maintenance services.',10,italic);
 if(q.milestones.length){ensure(50);y+=7;paragraph('Payment schedule',11,R-L,L+19,bold);for(const m of q.milestones)paragraph(m.label+' — AED '+money(m.amountCents),10,R-L-38,L+19);}
 ensure(100);y+=12;paragraph('Note: Any major additions, new features, third-party integrations, or substantial modifications outside the agreed scope will be evaluated separately and charged based on the requirements. Third-party costs will be billed to the client at actual cost. All integrations depend on the availability of third-party APIs. Changes, restrictions, or outages caused by third-party providers are outside Lunaria Studio’s control. Any rework required due to such changes will be quoted separately.',8,R-L,L,font,black,10.5);
 if(q.exclusions){ensure(50);y+=7;paragraph('Exclusions',10,R-L,L,bold);paragraph(q.exclusions,9,R-L,L);}
 // Full original twelve-clause terms remain editable in the form.
 fresh(false);y=32;put('TERMS & CONDITIONS',L,y,12,bold,orange);y+=17;
 paragraph(quotationTerms(q.terms),9.5,R-L,L,font,black,12.5);
 ensure(100);y+=17;paragraph('Contact',11,R-L,L,italic,gray);paragraph(q.preparedBy||'Shubham Jadhav',11);for(const s of [q.sender.phone,q.sender.email].filter(Boolean))paragraph(s,10);
 doc.setTitle(q.title+' — '+q.number);doc.setAuthor(q.sender.studio);doc.setSubject('Quotation for '+q.company);return doc.save();
}
