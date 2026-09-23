'use client';
import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, MessageCircle, Radio, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
export const PassExporter = ({ cardRef, matricNo, fullName, }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [exportError, setExportError] = useState('');
    const handleDownloadPng = async () => {
        if (!cardRef.current) {
            setExportError('Pass card reference not found. Please try again.');
            return;
        }
        try {
            setIsExporting(true);
            setExportError('');
            // Render crisp image with 2.5x pixel ratio for retina/social media display
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.98,
                pixelRatio: 2.5,
                cacheBust: true,
                backgroundColor: '#0A0D14',
                style: {
                    transform: 'none',
                    margin: '0',
                },
            });
            const cleanMatric = (matricNo || 'SCHOLAR').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const filename = `200L-Pass-${cleanMatric}.png`;
            const downloadLink = document.createElement('a');
            downloadLink.download = filename;
            downloadLink.href = dataUrl;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            setIsExporting(false);
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 4000);
        }
        catch (err) {
            console.error('Failed to export pass image:', err);
            setExportError('Failed to generate PNG pass image. Please try again or take a screenshot.');
            setIsExporting(false);
        }
    };
    const handleShareToWhatsApp = async () => {
        const portalUrl = window.location.origin;
        const scholarName = fullName ? fullName.trim() : 'an IT Scholar';
        const shareMessage = `I (${scholarName}) just leveled up to 200L in the Department of Information Technology (2025â€“2029 Set)!  Claim your official pass and join class committees here: ${portalUrl}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '200L Official IT Scholar Pass',
                    text: shareMessage,
                    url: portalUrl,
                });
                return;
            }
            catch (e) {
                // Fallback to wa.me if user cancelled or system failed
            }
        }
        // Direct WhatsApp share fallback
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    };
    return (<div className="w-full max-w-md mx-auto space-y-4">
      {/* Notifications */}
      {exportSuccess && (<div className="p-3.5 rounded-xl bg-blue-600/15 border border-blue-600/40 flex items-center gap-2.5 text-blue-300 text-xs font-mono animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0"/>
          <span>Pass downloaded successfully! Share to your WhatsApp Status or Instagram story.</span>
        </div>)}

      {exportError && (<div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs font-mono animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0"/>
          <span>{exportError}</span>
        </div>)}

      {/* Main Download & Share Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={handleDownloadPng} disabled={isExporting} className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-600-light text-gray-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-glow-blue transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50">
          {isExporting ? (<>
              <span className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"/>
              <span>Rendering 2.5x HD...</span>
            </>) : (<>
              <Download className="w-4 h-4"/>
              <span>Download Pass (PNG)</span>
            </>)}
        </button>

        <button type="button" onClick={handleShareToWhatsApp} className="w-full py-3.5 px-4 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95">
          <Share2 className="w-4 h-4"/>
          <span>Share to WhatsApp</span>
        </button>
      </div>

      {/* Official Community Hub Links */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-blue-300"/>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Official 200L Community Hubs
          </h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Stay connected for 200L timetable releases, tutorial schedules, committee meetings, and class broadcasts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* WhatsApp Community */}
          <a href="https://chat.whatsapp.com/ITDept2029Community" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 flex items-center gap-2.5 text-white transition-all group">
            <div className="p-1.5 rounded-lg bg-[#25D366] text-gray-950 shrink-0">
              <MessageCircle className="w-4 h-4"/>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-gray-100 group-hover:text-[#25D366] transition-colors truncate">
                Join Community
              </p>
              <p className="text-[10px] text-gray-400 font-mono">Official 200L Group</p>
            </div>
          </a>

          {/* Announcements Channel */}
          <a href="https://whatsapp.com/channel/ITDept2029Channel" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 flex items-center gap-2.5 text-white transition-all group">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
              <Radio className="w-4 h-4"/>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-gray-100 group-hover:text-blue-300 transition-colors truncate">
                Join Channel
              </p>
              <p className="text-[10px] text-gray-400 font-mono">Broadcast Updates</p>
            </div>
          </a>
        </div>
      </div>
    </div>);
};
