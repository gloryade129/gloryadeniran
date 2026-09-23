'use client';
import React, { useState } from 'react';
import { Download, FileSpreadsheet, Check, RefreshCw } from 'lucide-react';
import { dataService } from '@/components/it-dept/services/dataService';
export const CsvExportButton = ({ profiles, feedbacks, className = '', }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isExported, setIsExported] = useState(false);
    const handleExport = () => {
        if (isExporting)
            return;
        setIsExporting(true);
        try {
            dataService.exportCSV(profiles, feedbacks);
            setIsExported(true);
            setTimeout(() => {
                setIsExported(false);
            }, 2500);
        }
        catch (err) {
            console.error('CSV Export failed:', err);
        }
        finally {
            setIsExporting(false);
        }
    };
    return (<button type="button" onClick={handleExport} disabled={isExporting} className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all duration-200 active:scale-95 disabled:opacity-50 ${isExported
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-glow-sm-blue'
            : 'bg-cyber-surface hover:bg-cyber-elevated border-white/10 hover:border-blue-500/50 text-gray-200 hover:text-white'} ${className}`} title="Export clean RFC 4180 CSV with UTF-8 BOM">
      {isExporting ? (<>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400"/>
          <span>Generating CSV...</span>
        </>) : isExported ? (<>
          <Check className="w-3.5 h-3.5 text-blue-400"/>
          <span>CSV Exported!</span>
        </>) : (<>
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400"/>
          <span>Export CSV</span>
          <Download className="w-3 h-3 text-gray-400"/>
        </>)}
    </button>);
};
export default CsvExportButton;
