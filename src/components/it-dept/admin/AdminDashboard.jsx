'use client';
import { dataService, sendDirectEmailToStudent, sendDailySummaryEmail } from '@/components/it-dept/services/dataService';
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, BarChart3, MessageSquare, Users, Calendar, RefreshCw, Lock, ArrowLeft, AlertTriangle, Search, Database, TableProperties, Mail, Send, X, CheckCircle2, } from 'lucide-react';

import { KpiOverview } from './KpiOverview';
import { FeedbackCardList } from './FeedbackCardList';
import { CommitteeRoster } from './CommitteeRoster';
import { BirthdayCalendar } from './BirthdayCalendar';
import { CsvExportButton } from './CsvExportButton';

const STORAGE_KEY_AUTH = 'it_dept_admin_auth_v1';
const STORAGE_KEY_AUTH_COMPAT = 'it_portal_admin_auth';
export const AdminDashboard = ({ onBackToSurvey, onLock, }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [profiles, setProfiles] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [isDemo, setIsDemo] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState('');
    const [directorySearch, setDirectorySearch] = useState('');
    // Daily summary trigger state
    const [isSendingDigest, setIsSendingDigest] = useState(false);
    const [digestStatus, setDigestStatus] = useState(null);
    // Direct email modal state
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        studentName: '',
        studentEmail: '',
        matricNo: '',
        subject: '',
        message: '',
        isSending: false,
    });
    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent)
            setIsLoading(true);
        else
            setIsRefreshing(true);
        setErrorMessage(null);
        const pin = (typeof window !== 'undefined' ? sessionStorage.getItem('it_dept_admin_pin') : null) || process.env.NEXT_PUBLIC_ADMIN_PIN || '2025';
        try {
            const data = await dataService.getAdminDashboardData(pin);
            setProfiles(data.profiles || []);
            setFeedbacks(data.feedbacks || []);
            setIsDemo(Boolean(data.isDemo));
            setLastRefreshed(new Date().toLocaleTimeString());
        }
        catch (err) {
            console.error('Failed to load admin dashboard data:', err);
            setErrorMessage(err.message || 'Failed to retrieve administrative records.');
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    const handleLogout = () => {
        try {
            sessionStorage.removeItem(STORAGE_KEY_AUTH);
            sessionStorage.removeItem(STORAGE_KEY_AUTH_COMPAT);
        }
        catch {
            // ignore
        }
        if (onLock) {
            onLock();
        }
        else {
            onBackToSurvey();
        }
    };
    const handleSendDailySummary = async () => {
        setIsSendingDigest(true);
        setDigestStatus(null);
        try {
            // Compute summary stats
            const totalSubmissions = profiles.length;
            const today = new Date().toISOString().slice(0, 10);
            const todaySubmissions = profiles.filter(p => p.createdAt?.startsWith(today)).length;
            // Track occurrences
            const trackCounts = {};
            profiles.forEach(p => {
                if (p.techTrack)
                    trackCounts[p.techTrack] = (trackCounts[p.techTrack] || 0) + 1;
            });
            const topTechTrack = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Computing';
            // Committee occurrences
            const commCounts = {};
            profiles.forEach(p => {
                (p.committees || []).forEach(c => {
                    commCounts[c] = (commCounts[c] || 0) + 1;
                });
            });
            const topCommittee = Object.entries(commCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Academic';
            await sendDailySummaryEmail({
                totalSubmissions,
                todaySubmissions,
                topTechTrack,
                topCommittee,
            });
            setDigestStatus('Summary sent to adeniranglory129@gmail.com');
            setTimeout(() => setDigestStatus(null), 5000);
        }
        catch (e) {
            setDigestStatus('Summary trigger complete');
            setTimeout(() => setDigestStatus(null), 4000);
        }
        finally {
            setIsSendingDigest(false);
        }
    };
    const openDirectEmail = (student) => {
        setEmailModal({
            isOpen: true,
            studentName: student.fullName,
            studentEmail: student.email || '',
            matricNo: student.matricNo,
            subject: `Notice from Your Class Rep - 200L Transition`,
            message: `Dear ${student.fullName},\n\nThis is Your Class Rep regarding our 200L transition in the Information Technology Department.\n\nThank you for completing your transition review and committee preferences.\n\nBest regards,\nYour Class Rep\nIT Dept (2025-2029 Set)`,
            isSending: false,
            successMessage: undefined,
            errorMessage: undefined,
        });
    };
    const handleSendDirectEmail = async () => {
        if (!emailModal.studentEmail.trim()) {
            setEmailModal(prev => ({ ...prev, errorMessage: 'Please specify the recipient email address.' }));
            return;
        }
        setEmailModal(prev => ({ ...prev, isSending: true, errorMessage: undefined }));
        const res = await dataService.sendDirectEmail({
        toEmail: emailModal.studentEmail.trim(),
        toName: emailModal.studentName,
        subject: emailModal.subject,
        message: emailModal.message,
        senderName: 'Your Class Rep',
      });
        if (res.success) {
            setEmailModal(prev => ({
                ...prev,
                isSending: false,
                successMessage: `Email successfully sent to ${emailModal.studentEmail}!`,
            }));
            setTimeout(() => {
                setEmailModal(prev => ({ ...prev, isOpen: false, successMessage: undefined }));
            }, 2500);
        }
        else {
            setEmailModal(prev => ({
                ...prev,
                isSending: false,
                errorMessage: res.error || 'Failed to send email. Check EmailJS configuration in .env.',
            }));
        }
    };
    // Filtered profiles for Directory tab
    const filteredDirectory = profiles.filter(p => {
        if (!directorySearch.trim())
            return true;
        const q = directorySearch.toLowerCase();
        return (p.fullName.toLowerCase().includes(q) ||
            p.matricNo.toLowerCase().includes(q) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            p.techTrack.toLowerCase().includes(q) ||
            p.phone.includes(q));
    });
    return (<div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Administrative Navigation Header */}
      <div className="glass-card-elevated rounded-3xl p-5 sm:p-6 border border-blue-600/30 shadow-glow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"/>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Cohort Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-600/40 flex items-center justify-center text-blue-300 shadow-glow-sm-blue">
              <Shield className="w-6 h-6"/>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">
                  Executive Leadership Portal
                </h1>
                {/* Database Mode Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1.5 ${isDemo
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            : 'bg-blue-600/15 border-blue-600/40 text-blue-300'}`}>
                  <Database className="w-3 h-3"/>
                  <span>{isDemo ? 'Offline Demo Mode' : 'Live Supabase DB'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5 flex items-center gap-2">
                <span>IT Dept (2025-2029 Set) - 100L to 200L Transition Directory</span>
                {lastRefreshed && (<>
                    <span>-</span>
                    <span className="font-mono text-gray-400">Updated: {lastRefreshed}</span>
                  </>)}
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Daily Digest Trigger Button */}
            <button type="button" onClick={handleSendDailySummary} disabled={isSendingDigest} className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-mono text-blue-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50" title="Send daily summary report to adeniranglory129@gmail.com">
              <Mail className={`w-3.5 h-3.5 ${isSendingDigest ? 'animate-spin' : ''}`}/>
              <span className="hidden sm:inline">Send Daily Digest</span>
            </button>

            {/* Refresh Button */}
            <button type="button" onClick={() => fetchDashboardData(true)} disabled={isRefreshing} className="px-3.5 py-2 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50" title="Refresh live data">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}/>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* CSV Export Button */}
            <CsvExportButton profiles={profiles} feedbacks={feedbacks}/>

            {/* Lock / Logout Button */}
            <button type="button" onClick={handleLogout} className="px-3.5 py-2 rounded-xl bg-cyber-surface hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-xs font-mono text-gray-300 hover:text-rose-300 flex items-center gap-1.5 transition-colors" title="Lock Admin Portal & Logout">
              <Lock className="w-3.5 h-3.5"/>
              <span>Lock</span>
            </button>

            {/* Back to Survey Button */}
            <button type="button" onClick={onBackToSurvey} className="px-4 py-2 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5"/>
              <span>Survey</span>
            </button>
          </div>
        </div>

        {/* Digest status notice */}
        {digestStatus && (<div className="mt-3 p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-xs font-mono text-blue-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0"/>
            <span>{digestStatus}</span>
          </div>)}

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button type="button" onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${activeTab === 'overview'
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-glow-sm-blue font-bold'
            : 'bg-cyber-surface/60 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
            <BarChart3 className="w-3.5 h-3.5"/>
            <span>Overview KPIs</span>
          </button>

          <button type="button" onClick={() => setActiveTab('feedback')} className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${activeTab === 'feedback'
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-glow-sm-blue font-bold'
            : 'bg-cyber-surface/60 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
            <MessageSquare className="w-3.5 h-3.5"/>
            <span>Leadership Feedback</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
              {feedbacks.length}
            </span>
          </button>

          <button type="button" onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${activeTab === 'roster'
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-glow-sm-blue font-bold'
            : 'bg-cyber-surface/60 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
            <Users className="w-3.5 h-3.5"/>
            <span>Committee Rosters</span>
          </button>

          <button type="button" onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${activeTab === 'calendar'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
            : 'bg-cyber-surface/60 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
            <Calendar className="w-3.5 h-3.5"/>
            <span>Birthday Calendar</span>
          </button>

          <button type="button" onClick={() => setActiveTab('directory')} className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${activeTab === 'directory'
            ? 'bg-white/15 border-white/40 text-white font-bold'
            : 'bg-cyber-surface/60 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
            <TableProperties className="w-3.5 h-3.5"/>
            <span>Student Master Directory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
              {profiles.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (<div className="glass-card-elevated rounded-3xl p-16 text-center border border-white/10 space-y-4">
          <RefreshCw className="w-10 h-10 mx-auto text-blue-400 animate-spin"/>
          <h3 className="text-base font-bold text-white font-mono">
            Decrypting Leadership Analytics...
          </h3>
          <p className="text-xs text-gray-400 font-mono">
            Aggregating cohort transition records and feedback matrices.
          </p>
        </div>) : errorMessage ? (<div className="glass-card-elevated rounded-3xl p-10 text-center border border-rose-500/40 space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-rose-400"/>
          <h3 className="text-lg font-bold text-white font-mono">
            Failed to Load Admin Data
          </h3>
          <p className="text-xs text-rose-300 font-mono max-w-md mx-auto">
            {errorMessage}
          </p>
          <button type="button" onClick={() => fetchDashboardData()} className="px-6 py-2.5 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/20 text-xs font-mono text-white transition-colors">
            Retry Connection
          </button>
        </div>) : (<div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (<KpiOverview profiles={profiles} feedbacks={feedbacks}/>)}

          {/* Feedback Reviews Tab */}
          {activeTab === 'feedback' && (<FeedbackCardList feedbacks={feedbacks} profiles={profiles}/>)}

          {/* Committee Roster Tab */}
          {activeTab === 'roster' && (<CommitteeRoster profiles={profiles}/>)}

          {/* Birthday Calendar Tab */}
          {activeTab === 'calendar' && (<BirthdayCalendar profiles={profiles}/>)}

          {/* Student Master Directory Tab */}
          {activeTab === 'directory' && (<div className="glass-card-elevated rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Class Master Directory ({profiles.length} Registered)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Full student profiles, email contacts, academic ratings, and chosen 200L committees.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="text" value={directorySearch} onChange={e => setDirectorySearch(e.target.value)} placeholder="Search name, email, matric..." className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"/>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Matric No</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Birthday</th>
                      <th className="py-3 px-3">Tech Track</th>
                      <th className="py-3 px-3">100L Rating</th>
                      <th className="py-3 px-3">Committees</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredDirectory.length === 0 ? (<tr>
                        <td colSpan={10} className="py-8 text-center text-gray-500">
                          No student records matched your search.
                        </td>
                      </tr>) : (filteredDirectory.map((student, idx) => (<tr key={student.matricNo} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-3 text-white font-semibold whitespace-nowrap">
                            {student.fullName}
                          </td>
                          <td className="py-3 px-3 text-blue-300 whitespace-nowrap">
                            {student.matricNo}
                          </td>
                          <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                            {student.email || <span className="text-gray-500 italic">Not set</span>}
                          </td>
                          <td className="py-3 px-3 text-gray-300 whitespace-nowrap">
                            {student.phone}
                          </td>
                          <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                            {student.birthdayString || `${student.birthDay}/${student.birthMonth}`}
                          </td>
                          <td className="py-3 px-3 text-blue-400 whitespace-nowrap">
                            {student.techTrack || 'General'}
                          </td>
                          <td className="py-3 px-3 text-amber-400 whitespace-nowrap">
                            {student.academicRating100L || 5}/5
                          </td>
                          <td className="py-3 px-3 text-gray-300">
                            {student.committees && student.committees.length > 0
                        ? student.committees.join(', ')
                        : 'None'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button type="button" onClick={() => openDirectEmail(student)} className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 text-xs font-mono ml-auto transition-colors" title={`Send direct email to ${student.fullName}`}>
                              <Mail className="w-3 h-3"/>
                              <span>Email</span>
                            </button>
                          </td>
                        </tr>)))}
                  </tbody>
                </table>
              </div>
            </div>)}
        </div>)}

      {/* Direct Email Modal */}
      {emailModal.isOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card-elevated rounded-3xl w-full max-w-lg p-6 border border-blue-600/40 shadow-glow-blue relative space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Mail className="w-4 h-4"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Direct Email to Student
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Sent under signature: <span className="text-blue-300 font-semibold">Your Class Rep</span>
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Recipient Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Recipient Name
                </label>
                <input type="text" value={emailModal.studentName} disabled className="w-full px-3.5 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-gray-300"/>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Recipient Email Address <span className="text-blue-400">*</span>
                </label>
                <input type="email" value={emailModal.studentEmail} onChange={e => setEmailModal(prev => ({ ...prev, studentEmail: e.target.value }))} placeholder="student@unilorin.edu.ng" className="w-full px-3.5 py-2 rounded-xl bg-cyber-surface border border-blue-500/30 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"/>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Subject Line
                </label>
                <input type="text" value={emailModal.subject} onChange={e => setEmailModal(prev => ({ ...prev, subject: e.target.value }))} className="w-full px-3.5 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-400"/>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Message Body (from "Your Class Rep")
                </label>
                <textarea rows={6} value={emailModal.message} onChange={e => setEmailModal(prev => ({ ...prev, message: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"/>
              </div>
            </div>

            {/* Error or Success notification */}
            {emailModal.errorMessage && (<div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {emailModal.errorMessage}
              </div>)}
            {emailModal.successMessage && (<div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-200 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0"/>
                <span>{emailModal.successMessage}</span>
              </div>)}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors">
                Cancel
              </button>

              <button type="button" onClick={handleSendDirectEmail} disabled={emailModal.isSending} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-glow-sm-blue flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95">
                {emailModal.isSending ? (<>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin"/>
                    <span>Sending...</span>
                  </>) : (<>
                    <Send className="w-3.5 h-3.5"/>
                    <span>Send via Your Class Rep</span>
                  </>)}
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
export default AdminDashboard;
