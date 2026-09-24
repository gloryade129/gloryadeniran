'use client';

import {
  getMockStudents,
  saveMockStudent,
  getMockFeedback,
  saveMockFeedback,
  checkMockMatricExists,
  normalizeMatric,
} from './mockStorage';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';

function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let cellStr = Array.isArray(value) ? value.join('; ') : String(value);
  if (/^[=+\-@\t\r]/.test(cellStr)) {
    cellStr = "'" + cellStr;
  }
  if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('\r')) {
    cellStr = `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
}

export class DataService {
  async checkMatricRegistered(matricNo) {
    const normalized = normalizeMatric(matricNo);
    if (!normalized) return false;
    return checkMockMatricExists(normalized);
  }

  async checkMatricExists(matricNo) {
    return this.checkMatricRegistered(matricNo);
  }

  async submitStudentJourney(formData) {
    const normalizedMatric = normalizeMatric(formData.matricNo);
    if (!normalizedMatric) {
      return { success: false, error: 'A valid matriculation number is required.' };
    }

    try {
      const res = await fetch('/api/it-dept/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          return { success: false, error: data.error || 'A submission with this email or matric number has already been recorded.' };
        }
        return { success: false, error: data.error || 'Submission failed. Please try again.' };
      }

      const monthName = MONTH_NAMES[formData.birthMonth - 1] || `Month ${formData.birthMonth}`;
      const birthdayString = `${formData.birthDay} ${monthName}`;
      saveMockStudent({
        ...formData,
        matricNo: normalizedMatric,
        birthdayString,
      });

      return {
        success: true,
        profileId: data.profileId || 'server-profile-id',
        passToken: data.passToken || `IT200L-${normalizedMatric}-OK`,
      };
    } catch (err) {
      console.warn('API submission failed, falling back to local storage:', err);
      const monthName = MONTH_NAMES[formData.birthMonth - 1] || `Month ${formData.birthMonth}`;
      const birthdayString = `${formData.birthDay} ${monthName}`;
      const savedStudent = saveMockStudent({
        ...formData,
        matricNo: normalizedMatric,
        birthdayString,
      });
      return {
        success: true,
        profileId: savedStudent.id,
        passToken: `IT200L-${normalizedMatric}-LOCAL`,
      };
    }
  }

  async getAdminDashboardData(pin) {
    try {
      const res = await fetch('/api/it-dept/admin-data', {
        headers: { Authorization: `Bearer ${pin.trim()}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Unauthorized PIN');
      }

      const data = await res.json();
      return {
        profiles: data.profiles || [],
        feedbacks: data.feedbacks || [],
        isDemo: Boolean(data.isDemo),
      };
    } catch (err) {
      console.warn('Failed to load from /api/it-dept/admin-data, falling back to mock data:', err);
      return {
        profiles: getMockStudents(),
        feedbacks: getMockFeedback(),
        isDemo: true,
      };
    }
  }

  async sendDirectEmail(arg1, toName, subject, message) {
    let payload = {};
    if (typeof arg1 === 'object') {
      payload = {
        toEmail: arg1.toEmail || arg1.studentEmail,
        toName: arg1.toName || arg1.studentName,
        subject: arg1.subject,
        message: arg1.message,
      };
    } else {
      payload = { toEmail: arg1, toName, subject, message };
    }

    const res = await fetch('/api/it-dept/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send email');
    return data;
  }

  async sendDailySummary() {
    const res = await fetch('/api/it-dept/daily-summary', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send daily summary');
    return data;
  }

  exportCSV(profiles, feedbacks) {
    const headers = [
      'Record Type', 'Student ID', 'Full Name', 'Matric Number', 'Phone Number',
      'Birthday', 'Tech Track', '100L Rating (1-5)', 'Favorite Courses',
      'Toughest Courses', 'Challenges 100L', 'Committee Interests',
      '200L Vision Suggestions', 'Submission Timestamp', 'Feedback Anonymity',
      'CR Communication', 'CR Materials', 'CR Availability', 'CR Welfare',
      'ACR Communication', 'ACR Materials', 'ACR Availability', 'ACR Welfare',
      'Overall Leadership Score', 'Leadership Well Done', 'Leadership Critical Areas'
    ];

    const rows = [];
    profiles.forEach(p => {
      const matched = feedbacks.find(f => !f.isAnonymous && f.studentId === p.id);
      rows.push([
        'Student Profile', p.id || '', p.fullName, p.matricNo, p.phone,
        p.birthdayString || '', p.techTrack, String(p.academicRating100L),
        (p.favoriteCourses || []).join('; '), (p.toughestCourses || []).join('; '),
        (p.challenges100L || []).join('; '), (p.committees || []).join('; '),
        p.suggestions200L || '', p.createdAt || '',
        matched ? (matched.isAnonymous ? 'Anonymous' : 'Attributed') : 'None',
        matched ? String(matched.crCommunication) : '',
        matched ? String(matched.crMaterials) : '',
        matched ? String(matched.crAvailability) : '',
        matched ? String(matched.crWelfare) : '',
        matched ? String(matched.acrCommunication) : '',
        matched ? String(matched.acrMaterials) : '',
        matched ? String(matched.acrAvailability) : '',
        matched ? String(matched.acrWelfare) : '',
        matched ? String(matched.overallScore) : '',
        matched ? (matched.wellDone || matched.positiveShoutout || '') : '',
        matched ? (matched.criticalAreas || matched.qualitativeCritique || '') : '',
      ]);
    });

    feedbacks.filter(f => f.isAnonymous || !f.studentId).forEach((anon, idx) => {
      rows.push([
        'Anonymous Leadership Review', anon.id || `anon-${idx + 1}`,
        'Anonymous IT Scholar', 'Hidden for Privacy', 'Hidden',
        'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', anon.createdAt || '',
        'Anonymous',
        String(anon.crCommunication), String(anon.crMaterials), String(anon.crAvailability), String(anon.crWelfare),
        String(anon.acrCommunication), String(anon.acrMaterials), String(anon.acrAvailability), String(anon.acrWelfare),
        String(anon.overallScore || 5),
        anon.wellDone || anon.positiveShoutout || '',
        anon.criticalAreas || anon.qualitativeCritique || '',
      ]);
    });

    const csvContent = '\uFEFF' + [
      headers.map(sanitizeCsvCell).join(','),
      ...rows.map(r => r.map(sanitizeCsvCell).join(','))
    ].join('\r\n');

    if (typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `it_dept_200l_survey_export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }
  }
}

export const dataService = new DataService();
export default dataService;

export const sendDirectEmailToStudent = (payload) => dataService.sendDirectEmail(payload);
export const sendDailySummaryEmail = () => dataService.sendDailySummary();
export const sendStudentConfirmationEmail = async () => ({ success: true });
export const sendAdminNotificationEmail = async () => ({ success: true });
