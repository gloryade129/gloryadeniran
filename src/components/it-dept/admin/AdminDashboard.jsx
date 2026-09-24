'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, BarChart3, MessageSquare, Users, Calendar, RefreshCw, Lock, ArrowLeft, Search, Database, Mail, Download, Send, X, CheckCircle2, Eye, Phone, Heart, Wallet, Star, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { dataService } from '@/components/it-dept/services/dataService';
import { KpiOverview } from './KpiOverview';
import { FeedbackCardList } from './FeedbackCardList';
import { CommitteeRoster } from './CommitteeRoster';
import { BirthdayCalendar } from './BirthdayCalendar';
import { CsvExportButton } from './CsvExportButton';

const STORAGE_KEY_AUTH = 'it_dept_admin_auth_v1';
const STORAGE_KEY_AUTH_COMPAT = 'it_portal_admin_auth';

export const AdminDashboard = ({ onBackToSurvey, onLock }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [profiles, setProfiles] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Daily digest trigger state
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
    successMessage: '',
    errorMessage: '',
  });

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    const pin = (typeof window !== 'undefined' ? sessionStorage.getItem('it_dept_admin_pin') : null) || '2025';

    try {
      const data = await dataService.getAdminDashboardData(pin);
      setProfiles(data.profiles || []);
      setFeedbacks(data.feedbacks || []);
      setIsDemo(Boolean(data.isDemo));
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setErrorMessage(err.message || 'Failed to retrieve administrative records.');
    } finally {
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
      sessionStorage.removeItem('it_dept_admin_pin');
    } catch (e) {}
    if (onLock) onLock();
    else onBackToSurvey();
  };

  const handleSendDailySummary = async () => {
    setIsSendingDigest(true);
    setDigestStatus(null);
    try {
      const pin = (typeof window !== 'undefined' ? sessionStorage.getItem('it_dept_admin_pin') : null) || '2025';
      const res = await fetch('/api/it-dept/daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify({
          totalSubmissions: profiles.length,
          recentCount: profiles.length,
          topTechTrack: profiles[0]?.techTrack || 'Computing',
          topCommittee: 'Academic',
          avgLeadershipScore: '4.8',
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDigestStatus('Summary email successfully dispatched to adeniranglory129@gmail.com!');
      } else {
        setDigestStatus(`Notice: ${json.error || 'Check Brevo credentials'}`);
      }
    } catch (err) {
      setDigestStatus(`Error: ${err.message}`);
    } finally {
      setIsSendingDigest(false);
      setTimeout(() => setDigestStatus(null), 5000);
    }
  };

  const handleOpenEmailModal = (student) => {
    setEmailModal({
      isOpen: true,
      studentName: student.fullName,
      studentEmail: student.email || '',
      matricNo: student.matricNo,
      subject: 'Message from Your Class Rep - IT Dept',
      message: `Dear ${student.fullName},\n\nThis is Glory Adeniran (Your Class Rep). Thank you for filling out the department directory and feedback form.\n\nBest regards,\nYour Class Rep`,
      isSending: false,
      successMessage: '',
      errorMessage: '',
    });
  };

  const handleDeleteStudent = async (student) => {
    if (!student) return;
    setIsDeleting(true);
    try {
      const pin = (typeof window !== 'undefined' ? sessionStorage.getItem('it_dept_admin_pin') : null) || '2025';
      const res = await dataService.deleteStudentResponse(student.id, student.matricNo, pin);
      if (res.success) {
        setProfiles(prev => prev.filter(p => p.id !== student.id && p.matricNo !== student.matricNo));
        setDeleteTarget(null);
        if (selectedStudent && (selectedStudent.id === student.id || selectedStudent.matricNo === student.matricNo)) {
          setSelectedStudent(null);
        }
        setDigestStatus(`Record for ${student.fullName} (${student.matricNo}) successfully deleted.`);
        setTimeout(() => setDigestStatus(null), 5000);
      } else {
        alert(res.error || 'Failed to delete student response.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting student.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendDirectEmail = async () => {
    if (!emailModal.studentEmail.trim()) {
      setEmailModal(prev => ({ ...prev, errorMessage: 'Recipient email is required.' }));
      return;
    }
    setEmailModal(prev => ({ ...prev, isSending: true, errorMessage: '' }));
    try {
      const pin = (typeof window !== 'undefined' ? sessionStorage.getItem('it_dept_admin_pin') : null) || '2025';
      const res = await fetch('/api/it-dept/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify({
          toEmail: emailModal.studentEmail,
          toName: emailModal.studentName,
          subject: emailModal.subject,
          message: emailModal.message,
          senderName: 'Your Class Rep',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailModal(prev => ({
          ...prev,
          isSending: false,
          successMessage: `Email successfully sent to ${emailModal.studentEmail}!`,
        }));
        setTimeout(() => {
          setEmailModal(prev => ({ ...prev, isOpen: false, successMessage: '' }));
        }, 2000);
      } else {
        setEmailModal(prev => ({
          ...prev,
          isSending: false,
          errorMessage: data.error || 'Failed to send email.',
        }));
      }
    } catch (err) {
      setEmailModal(prev => ({
        ...prev,
        isSending: false,
        errorMessage: err.message,
      }));
    }
  };

  const filteredDirectory = profiles.filter(p => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    return (
      (p.fullName && p.fullName.toLowerCase().includes(q)) ||
      (p.matricNo && p.matricNo.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.techTrack && p.techTrack.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  return (
    <div className="it-admin-wrap it-animate-fade">
      {/* Top Header */}
      <div className="it-admin-header">
        <div className="it-admin-header-flex">
          <div className="it-admin-title-row">
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', flexShrink: 0 }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Executive Leadership Portal
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    background: isDemo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${isDemo ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                    color: isDemo ? '#FBBF24' : '#34D399',
                  }}
                >
                  <Database size={10} />
                  <span>{isDemo ? 'Demo Storage Mode' : 'Live Supabase DB'}</span>
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                IT Department (2025–2029 Set) · {lastRefreshed ? `Updated ${lastRefreshed}` : 'Live Directory'}
              </p>
            </div>
          </div>

          {/* Actions Toolbar */}
          <div className="it-admin-actions">
            <button
              type="button"
              onClick={handleSendDailySummary}
              disabled={isSendingDigest}
              className="it-admin-btn it-admin-btn-primary"
              title="Send summary to adeniranglory129@gmail.com"
            >
              <Mail size={13} />
              <span>{isSendingDigest ? 'Sending...' : 'Send Daily Digest'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="it-admin-btn"
              title="Refresh Data"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <CsvExportButton profiles={profiles} feedbacks={feedbacks} />

            <button
              type="button"
              onClick={handleLogout}
              className="it-admin-btn it-admin-btn-danger"
            >
              <Lock size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {digestStatus && (
          <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#93C5FD', fontSize: '0.75rem' }}>
            {digestStatus}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="it-admin-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`it-admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <BarChart3 size={15} />
          <span>Overview KPIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`it-admin-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
        >
          <MessageSquare size={15} />
          <span>Leadership Feedback ({feedbacks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('committees')}
          className={`it-admin-tab-btn ${activeTab === 'committees' ? 'active' : ''}`}
        >
          <Users size={15} />
          <span>Committee Rosters</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('birthdays')}
          className={`it-admin-tab-btn ${activeTab === 'birthdays' ? 'active' : ''}`}
        >
          <Calendar size={15} />
          <span>Birthday Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`it-admin-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
        >
          <Users size={15} />
          <span>Student Directory ({profiles.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <KpiOverview profiles={profiles} feedbacks={feedbacks} estimatedClassSize={120} />
      )}

      {activeTab === 'feedback' && (
        <FeedbackCardList feedbacks={feedbacks} profiles={profiles} />
      )}

      {activeTab === 'committees' && (
        <CommitteeRoster profiles={profiles} />
      )}

      {activeTab === 'birthdays' && (
        <BirthdayCalendar students={profiles} />
      )}

      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div className="it-admin-card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Search students by name, matric number, email, or track..."
                className="it-input"
                style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="it-admin-table-wrap">
            <table className="it-admin-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Matric No</th>
                  <th>WhatsApp Phone</th>
                  <th>Email</th>
                  <th>Tech Track</th>
                  <th>Birthday</th>
                  <th>Volunteer Role(s)</th>
                  <th>Support (₦)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectory.length > 0 ? (
                  filteredDirectory.map((student, idx) => (
                    <tr key={student.id || idx}>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{student.fullName}</span>
                          <Eye size={11} color="#60A5FA" />
                        </button>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#93C5FD' }}>{student.matricNo}</td>
                      <td>{student.phone}</td>
                      <td>{student.email || '—'}</td>
                      <td>
                        <span className="it-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          {student.techTrack?.split(' (')[0] || 'Tech'}
                        </span>
                      </td>
                      <td>{student.birthday || `${student.birthDay}/${student.birthMonth}`}</td>
                      <td>
                        {(student.volunteerRoles || student.committees || []).length > 0
                          ? (student.volunteerRoles || student.committees).join(', ')
                          : 'None'}
                      </td>
                      <td>
                        {student.supportAmount > 0 ? (
                          <span className="it-chip it-chip-selected" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                            ₦{Number(student.supportAmount).toLocaleString()} ({student.paymentStatus || 'pledged'})
                          </span>
                        ) : (
                          <span style={{ color: '#64748B' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="it-admin-btn it-admin-btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            title="View full survey response"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEmailModal(student)}
                            className="it-admin-btn"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            title="Send email"
                          >
                            <Mail size={12} />
                            <span>Email</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(student)}
                            className="it-admin-btn it-admin-btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            title="Delete this student response"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                      No student records found matching "{directorySearch}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Direct Email Modal */}
      {emailModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6, 9, 19, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="it-card" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
              Dispatch Email to {emailModal.studentName}
            </h3>

            {emailModal.successMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: '0.8125rem', marginBottom: '14px' }}>
                {emailModal.successMessage}
              </div>
            )}

            {emailModal.errorMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.8125rem', marginBottom: '14px' }}>
                {emailModal.errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Recipient Email
                </label>
                <input
                  type="email"
                  className="it-input"
                  value={emailModal.studentEmail}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, studentEmail: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  className="it-input"
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Message
                </label>
                <textarea
                  className="it-input"
                  rows={4}
                  value={emailModal.message}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                  className="it-btn-secondary"
                  style={{ minHeight: '40px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmail}
                  disabled={emailModal.isSending}
                  className="it-btn-primary"
                  style={{ minHeight: '40px', padding: '8px 20px' }}
                >
                  <Send size={14} />
                  <span>{emailModal.isSending ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Student Response Modal */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(6, 9, 19, 0.85)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="it-card"
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
              borderRadius: '16px',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {/* Header info */}
            <div style={{ marginBottom: '18px', paddingRight: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {selectedStudent.fullName}
                </h3>
                <span className="it-chip it-chip-selected" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  {selectedStudent.techTrack || 'Computing'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: '#93C5FD' }}>
                <span style={{ fontFamily: 'monospace' }}>{selectedStudent.matricNo}</span>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ color: '#94A3B8' }}>{selectedStudent.birthday || `${selectedStudent.birthDay}/${selectedStudent.birthMonth}`}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Direct Contact Links */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedStudent.phone && (
                  <a
                    href={`https://wa.me/${selectedStudent.phone.replace(/\D/g, '').startsWith('0') ? '234' + selectedStudent.phone.replace(/\D/g, '').slice(1) : selectedStudent.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="it-admin-btn"
                    style={{ background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#4ADE80' }}
                  >
                    <Phone size={13} />
                    <span>WhatsApp ({selectedStudent.phone})</span>
                  </a>
                )}
                {selectedStudent.email && (
                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedStudent;
                      setSelectedStudent(null);
                      handleOpenEmailModal(st);
                    }}
                    className="it-admin-btn it-admin-btn-primary"
                  >
                    <Mail size={13} />
                    <span>Send Email ({selectedStudent.email})</span>
                  </button>
                )}
              </div>

              {/* Leadership Support & Financial Contribution Card */}
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Wallet size={16} color="#60A5FA" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    Department Leadership Support
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Contribution:</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedStudent.supportAmount > 0 ? '#60A5FA' : '#94A3B8' }}>
                      {selectedStudent.supportAmount > 0 ? `₦${Number(selectedStudent.supportAmount).toLocaleString()}` : 'No Financial Support'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Payment Status:</span>
                    <span
                      className="it-chip"
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        background: selectedStudent.paymentStatus === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: selectedStudent.paymentStatus === 'completed' ? '#4ADE80' : '#FDE047',
                        borderColor: selectedStudent.paymentStatus === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                      }}
                    >
                      {selectedStudent.paymentStatus || 'pledged / pending'}
                    </span>
                  </div>
                  {selectedStudent.paymentRef && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Reference:</span>
                      <span style={{ fontFamily: 'monospace', color: '#CBD5E1', fontSize: '0.75rem' }}>{selectedStudent.paymentRef}</span>
                    </div>
                  )}
                  {selectedStudent.supportNote && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Student Support Note:</span>
                      <p style={{ margin: '2px 0 0', fontStyle: 'italic', color: '#E2E8F0', fontSize: '0.8125rem' }}>
                        "{selectedStudent.supportNote}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Volunteer Roles */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Heart size={16} color="#EC4899" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    Volunteered Role(s) for 200L
                  </span>
                </div>
                {(selectedStudent.volunteerRoles || selectedStudent.committees || []).length > 0 ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(selectedStudent.volunteerRoles || selectedStudent.committees).map((role, rIdx) => (
                      <span key={rIdx} className="it-chip it-chip-selected" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>No volunteer roles selected.</span>
                )}
              </div>

              {/* 100L Academic Review */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    100L Academic Retrospective
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} fill="#FBBF24" color="#FBBF24" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {selectedStudent.academicRating100L || 'N/A'} / 5.0
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                  {selectedStudent.favoriteCourses?.length > 0 && (
                    <div>
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>Favorite Course(s):</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selectedStudent.favoriteCourses.map((c, i) => (
                          <span key={i} className="it-chip" style={{ fontSize: '0.72rem', padding: '2px 8px', color: '#60A5FA' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedStudent.toughestCourses?.length > 0 && (
                    <div>
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>Toughest Course(s):</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selectedStudent.toughestCourses.map((c, i) => (
                          <span key={i} className="it-chip" style={{ fontSize: '0.72rem', padding: '2px 8px', color: '#F87171' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedStudent.challenges100L?.length > 0 && (
                    <div>
                      <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>Challenges Faced:</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selectedStudent.challenges100L.map((c, i) => (
                          <span key={i} className="it-chip" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 200L Suggestions */}
              {selectedStudent.suggestions200L && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Student Suggestions for 200 Level:
                  </span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                    "{selectedStudent.suggestions200L}"
                  </p>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedStudent)}
                  className="it-admin-btn it-admin-btn-danger"
                  style={{ minHeight: '38px', padding: '6px 14px', fontSize: '0.8125rem' }}
                >
                  <Trash2 size={13} />
                  <span>Delete Record</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="it-btn-secondary"
                  style={{ minHeight: '38px', padding: '6px 18px', fontSize: '0.8125rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(6, 9, 19, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="it-card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
              Delete Student Response?
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the response for{' '}
              <strong style={{ color: '#FFFFFF' }}>{deleteTarget.fullName}</strong> ({deleteTarget.matricNo})?
              This will remove their profile and leadership feedback from the database.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="it-btn-secondary"
                style={{ minHeight: '38px', padding: '6px 18px', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStudent(deleteTarget)}
                disabled={isDeleting}
                className="it-admin-btn it-admin-btn-danger"
                style={{ minHeight: '38px', padding: '6px 20px', fontSize: '0.8125rem' }}
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;
