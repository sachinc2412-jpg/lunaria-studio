import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Lunaria — Client Desk',description:'Your clients, creative work and finances. Thoughtfully connected.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
