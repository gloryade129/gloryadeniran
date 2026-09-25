'use client';
import React from 'react';
import { Download } from 'lucide-react';

export const CsvExportButton = ({ profiles = [], feedbacks = [] }) => {
  const handleExport = () => {
    if (profiles.length === 0) {
      alert('No student records available to export.');
      return;
    }

    const headers = [
      'Full Name',
      'Matric No',
      'Email',
      'Phone',
      'Birthday',
      'Tech Track',
      '100L Rating',
      'Favorite Courses',
      'Toughest Courses',
      'Volunteer Roles',
      'CR Glory Continue',
      'CR Reason',
      'ACR Esther Continue',
      'ACR Reason',
      'Leadership Score',
      'What Leadership Did Well',
      'Critical Areas to Improve in 200L',
      'Support Choice',
      'Support Amount (NGN)',
      'Payment Status',
      'Payment Ref',
      'Support Note',
      'Suggestions 200L',
      'Date Submitted'
    ];

    const rows = profiles.map(p => {
      const fb = feedbacks.find(
        f =>
          (f.studentId && f.studentId === p.id) ||
          (!f.isAnonymous && f.studentMatric && f.studentMatric.toLowerCase() === p.matricNo?.toLowerCase())
      );

      return [
        `"${p.fullName || ''}"`,
        `"${p.matricNo || ''}"`,
        `"${p.email || ''}"`,
        `"${p.phone || ''}"`,
        `"${p.birthday || ''}"`,
        `"${p.techTrack || ''}"`,
        p.academicRating100L || '',
        `"${(p.favoriteCourses || []).join(', ')}"`,
        `"${(p.toughestCourses || []).join(', ')}"`,
        `"${(p.volunteerRoles || []).join(', ')}"`,
        `"${p.crRecommendContinue || fb?.crRecommendContinue || ''}"`,
        `"${((p.crRecommendReason || fb?.crRecommendReason || '')).replace(/"/g, '""')}"`,
        `"${p.acrRecommendContinue || fb?.acrRecommendContinue || ''}"`,
        `"${((p.acrRecommendReason || fb?.acrRecommendReason || '')).replace(/"/g, '""')}"`,
        fb?.overallScore || '',
        `"${((fb?.wellDone || '')).replace(/"/g, '""')}"`,
        `"${((fb?.criticalAreas || '')).replace(/"/g, '""')}"`,
        `"${p.supportChoice || 'no'}"`,
        p.supportAmount || 0,
        `"${p.paymentStatus || 'unpaid'}"`,
        `"${p.paymentRef || ''}"`,
        `"${(p.supportNote || '').replace(/"/g, '""')}"`,
        `"${(p.suggestions200L || '').replace(/"/g, '""')}"`,
        `"${p.createdAt || ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IT_Dept_2025_2029_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="it-admin-btn"
      title="Download student directory as CSV"
    >
      <Download size={13} />
      <span>Export CSV</span>
    </button>
  );
};
export default CsvExportButton;
