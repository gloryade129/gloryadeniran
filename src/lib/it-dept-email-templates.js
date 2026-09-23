/**
 * src/lib/it-dept-email-templates.js
 * HTML Email templates for Information Technology Department 2025-2029 Set.
 * Branded with ITSA Royal Blue, Space Grotesk styling, and zero emojis.
 */

export function buildStudentConfirmationEmail({ studentName, matricNo, techTrack, committees }) {
  const commList = committees && committees.length > 0 ? committees.join(', ') : 'None selected';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>200L Transition Confirmation</title>
  <style>
    body { margin: 0; padding: 0; background-color: #05080F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; line-height: 1.6; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C1220; border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 16px; overflow: hidden; }
    .header { background: #080D1A; padding: 32px 28px 24px; border-bottom: 2px solid #2563EB; text-align: left; }
    .dept-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #60A5FA; font-weight: 700; margin-bottom: 4px; }
    .headline { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #FFFFFF; margin-bottom: 16px; }
    .card { background: #101929; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; }
    .card-label { color: #94A3B8; }
    .card-value { color: #FFFFFF; font-weight: 600; font-family: monospace; }
    .note-box { background: rgba(37, 99, 235, 0.08); border-left: 3px solid #2563EB; padding: 16px; margin: 24px 0; font-size: 13px; color: #CBD5E1; }
    .footer { padding: 24px 28px; background: #080D1A; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="wrapper">
      <div class="header">
        <div class="dept-title">University of Ilorin - Faculty of Computing</div>
        <div class="headline">Department of Information Technology</div>
        <div style="font-size: 12px; color: #94A3B8; margin-top: 4px;">2025-2029 Set: 100L to 200L Transition Record</div>
      </div>
      <div class="body">
        <div class="greeting">Hello ${studentName},</div>
        <p style="margin: 0 0 16px 0;">
          Congratulations on advancing to 200 Level! Your transition retrospective, leadership feedback, and committee preferences have been officially received by class leadership.
        </p>

        <div class="card">
          <div style="font-size: 11px; text-transform: uppercase; color: #60A5FA; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 10px;">
            Your Verified Transition Profile
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Matric Number:</td>
              <td style="padding: 6px 0; color: #60A5FA; font-family: monospace; font-size: 13px; text-align: right; font-weight: bold;">${matricNo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Tech Specialization:</td>
              <td style="padding: 6px 0; color: #FFFFFF; font-size: 13px; text-align: right;">${techTrack || 'General Computing'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 13px;">Selected Committees:</td>
              <td style="padding: 6px 0; color: #FFFFFF; font-size: 13px; text-align: right;">${commList}</td>
            </tr>
          </table>
        </div>

        <div class="note-box">
          <strong>A Word from Your Class Rep:</strong><br>
          "100 Level laid our foundational groundwork in general computing and natural sciences. In 200 Level, we dive deep into specialized systems engineering, hardware architectures, and core software development. Let us work closely as a unified class to excel academically and technically."
        </div>

        <p style="font-size: 13px; color: #94A3B8; margin-bottom: 0;">
          Your digital 200L Scholar Pass is active. Please stay engaged on our official class platforms for upcoming timetable releases, tutorial group pairings, and committee kickoff meetings.
        </p>
      </div>
      <div class="footer">
        <div><strong>Your Class Rep</strong> - Information Technology Department (2025-2029 Set)</div>
        <div style="margin-top: 4px;">Faculty of Computing - University of Ilorin</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function buildAdminAlertEmail({ studentName, studentEmail, matricNo, phone, techTrack, committees, academicRating100L, challenges, suggestions }) {
  const commList = committees && committees.length > 0 ? committees.join(', ') : 'None';
  const challengeList = challenges && challenges.length > 0 ? challenges.join(', ') : 'None specified';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New 200L Submission Alert</title>
  <style>
    body { margin: 0; padding: 0; background-color: #05080F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E2E8F0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C1220; border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 14px; padding: 24px; }
    h2 { color: #FFFFFF; margin-top: 0; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    td { padding: 8px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .label { color: #94A3B8; width: 35%; }
    .val { color: #FFFFFF; font-weight: 600; }
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="wrapper">
      <div style="font-size: 11px; color: #60A5FA; text-transform: uppercase; font-family: monospace; font-weight: bold;">
        Executive Submission Alert - IT Dept 2025-2029 Set
      </div>
      <h2>New 200L Transition Submission Received</h2>
      <p style="font-size: 13px; color: #94A3B8;">A student has just completed their transition journey on the portal:</p>
      <table>
        <tr><td class="label">Full Name:</td><td class="val">${studentName}</td></tr>
        <tr><td class="label">Matric Number:</td><td class="val" style="color: #60A5FA; font-family: monospace;">${matricNo}</td></tr>
        <tr><td class="label">Email Address:</td><td class="val">${studentEmail || 'N/A'}</td></tr>
        <tr><td class="label">Phone:</td><td class="val">${phone}</td></tr>
        <tr><td class="label">100L Rating:</td><td class="val">${academicRating100L}/5</td></tr>
        <tr><td class="label">Tech Track:</td><td class="val">${techTrack}</td></tr>
        <tr><td class="label">Committees:</td><td class="val">${commList}</td></tr>
        <tr><td class="label">Key Challenges:</td><td class="val">${challengeList}</td></tr>
        <tr><td class="label">200L Suggestions:</td><td class="val">${suggestions || 'None provided'}</td></tr>
      </table>
      <div style="margin-top: 20px; font-size: 11px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
        Sent automatically to adeniranglory129@gmail.com from the IT Dept Portal.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function buildDirectStudentEmail({ studentName, subject, messageBody }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #05080F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E2E8F0; line-height: 1.6; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C1220; border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 14px; overflow: hidden; }
    .header { background: #080D1A; padding: 28px 24px 20px; border-bottom: 2px solid #2563EB; }
    .body { padding: 28px 24px; font-size: 14px; white-space: pre-wrap; color: #CBD5E1; }
    .footer { padding: 20px 24px; background: #080D1A; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="wrapper">
      <div class="header">
        <div style="font-size: 11px; text-transform: uppercase; color: #60A5FA; letter-spacing: 2px; font-weight: 700;">
          Information Technology Department (2025-2029 Set)
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-top: 4px;">
          ${subject}
        </div>
      </div>
      <div class="body">${messageBody}</div>
      <div class="footer">
        <div><strong>Your Class Rep</strong> - IT Dept 2025-2029 Set</div>
        <div style="margin-top: 3px;">Faculty of Computing - University of Ilorin</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function buildDailyDigestEmail({ totalSubmissions, todaySubmissions, topTechTrack, topCommittee }) {
  const dateStr = new Date().toLocaleDateString('en-NG', { dateStyle: 'full', timeZone: 'Africa/Lagos' });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily 200L Transition Digest</title>
  <style>
    body { margin: 0; padding: 0; background-color: #05080F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E2E8F0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C1220; border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 14px; padding: 28px; }
    .metric-card { background: #101929; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="wrapper">
      <div style="font-size: 11px; color: #60A5FA; text-transform: uppercase; font-family: monospace; font-weight: bold;">
        Executive Leadership Daily Report
      </div>
      <h2 style="color: #FFFFFF; margin: 6px 0 16px 0; font-size: 20px;">200L Transition Daily Digest</h2>
      <p style="font-size: 13px; color: #94A3B8; margin-bottom: 20px;">Report Date: <strong>${dateStr}</strong></p>

      <div class="metric-card">
        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">Total Cohort Submissions</div>
        <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; font-family: monospace;">${totalSubmissions}</div>
      </div>

      <div class="metric-card">
        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">New Submissions Today</div>
        <div style="font-size: 26px; font-weight: 800; color: #60A5FA; font-family: monospace;">${todaySubmissions}</div>
      </div>

      <div class="metric-card">
        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">Leading Tech Specialization</div>
        <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">${topTechTrack}</div>
      </div>

      <div class="metric-card">
        <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase;">Highest Demand Committee</div>
        <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">${topCommittee}</div>
      </div>

      <div style="margin-top: 24px; font-size: 11px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
        Sent directly to adeniranglory129@gmail.com from the IT Department Portal.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
