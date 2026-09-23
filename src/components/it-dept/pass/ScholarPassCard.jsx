'use client';
import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Terminal, Cpu, Sparkles, CheckCircle, Calendar, Award } from 'lucide-react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';
export function generatePassId(matric) {
    let hash = 0;
    const str = (matric || 'IT/2024/000').toUpperCase().trim();
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
    return `#IT29-${hex}-200L`;
}
export const ScholarPassCard = forwardRef(({ formData }, ref) => {
    const passId = generatePassId(formData.matricNo);
    const cleanMatric = formData.matricNo.toUpperCase() || 'IT/2024/000';
    const cleanName = formData.fullName.toUpperCase() || 'ESTEEMED SCHOLAR';
    const birthMonthName = MONTH_NAMES[formData.birthMonth - 1] || 'January';
    const verificationUrl = `https://it-dept-2029.web.app/verify/${encodeURIComponent(cleanMatric)}`;
    return (<div ref={ref} id="scholar-pass-card" className="w-full max-w-[420px] mx-auto rounded-3xl p-6 sm:p-7 relative overflow-hidden text-left font-sans select-none" style={{
            backgroundColor: '#0A0D14',
            backgroundImage: `
            radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            linear-gradient(to bottom, #0d1527, #060a12)
          `,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(37, 99, 235, 0.35)',
            border: '2px solid rgba(37, 99, 235, 0.5)',
        }}>
        {/* Holographic Watermark Glows */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37, 99, 235, 0.25)' }}/>
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(59, 130, 246, 0.2)' }}/>

        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(37, 99, 235, 0.4)',
            color: '#3B82F6',
        }}>
              <Terminal className="w-5 h-5 text-blue-400"/>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-blue-400 font-bold">
                FACULTY OF COMPUTING
              </p>
              <h1 className="text-xs font-mono font-extrabold tracking-wider text-white">
                DEPT OF INFORMATION TECHNOLOGY
              </h1>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border" style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderColor: 'rgba(59, 130, 246, 0.4)',
            color: '#93C5FD',
        }}>
            2025â€“2029 SET
          </div>
        </div>

        {/* Level Up Banner */}
        <div className="rounded-xl px-3.5 py-2 mb-5 flex items-center justify-between border" style={{
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderColor: 'rgba(37, 99, 235, 0.35)',
        }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400"/>
            <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
              200L OFFICIAL SCHOLAR PASS
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded" style={{
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            color: '#60A5FA',
        }}>
            ACTIVE
          </span>
        </div>

        {/* Student Identity Core */}
        <div className="space-y-3 mb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
              FULL SCHOLAR NAME
            </span>
            <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight break-words">
              {cleanName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
                MATRICULATION NO
              </span>
              <p className="text-sm font-mono font-bold text-blue-400 tracking-wider">
                {cleanMatric}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
                CLASS BIRTHDAY
              </span>
              <p className="text-xs font-mono font-medium text-gray-200 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-blue-400"/>
                {formData.birthDay} {birthMonthName}
              </p>
            </div>
          </div>
        </div>

        {/* Tech Track & Committees */}
        <div className="space-y-2.5 mb-6 pt-2 border-t border-white/10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
              PRIMARY TECH SPECIALIZATION
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border" style={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderColor: 'rgba(59, 130, 246, 0.35)',
            color: '#BFDBFE',
        }}>
              <Cpu className="w-3.5 h-3.5 text-blue-400"/>
              <span>{formData.techTrack || 'Computing & Systems'}</span>
            </div>
          </div>

          {formData.committees && formData.committees.length > 0 && (<div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
                200L CLASS COMMITTEES
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formData.committees.map((comm) => (<span key={comm} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#E5E7EB',
                }}>
                    <CheckCircle className="w-2.5 h-2.5 text-blue-400"/>
                    <span>{comm}</span>
                  </span>))}
              </div>
            </div>)}
        </div>

        {/* Bottom Verification Section: QR Code & Hash Token */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-4 border" style={{
            backgroundColor: 'rgba(16, 22, 34, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1 text-blue-400">
              <ShieldCheck className="w-4 h-4"/>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
                AUTHENTICATED PASS
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-white mb-0.5">
              {passId}
            </p>
            <p className="text-[10px] font-mono text-gray-400">
              Session: 2026/2027 (200L)
            </p>
          </div>

          {/* Verification QR Code */}
          <div className="p-1.5 rounded-xl border shrink-0 bg-white" style={{ borderColor: 'rgba(37, 99, 235, 0.4)' }}>
            <QRCodeSVG value={verificationUrl} size={64} level="M" fgColor="#0A0D14" bgColor="#FFFFFF"/>
          </div>
        </div>

        {/* Security Microchip Strip */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
          <span className="flex items-center gap-1 text-gray-400">
            <Award className="w-3 h-3 text-blue-400"/> IT DEPT LEADERSHIP
          </span>
          <span>LEVEL-UP PROTOCOL V2.0</span>
        </div>
      </div>);
});
ScholarPassCard.displayName = 'ScholarPassCard';
