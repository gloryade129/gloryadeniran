/**
 * lib/survey-email-templates.js
 * Generates responsive, elegant HTML confirmation and follow-up emails
 * tailored by spiritual segment. Strictly zero emojis.
 */

import { getSegmentMetadata } from './survey-segmentation.js';

/**
 * Builds the complete HTML email for a survey respondent
 * @param {Object} entry - Survey entry data
 * @returns {string} - Complete HTML markup
 */
export function buildSurveyFollowUpEmail(entry = {}) {
  const {
    full_name = 'Friend',
    assigned_segment = 'GENERAL_GROWTH',
    faith_status = '',
    church_name = '',
  } = entry;

  const segmentMeta = getSegmentMetadata(assigned_segment);
  const firstName = full_name.split(' ')[0] || full_name;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Reflection on Prayer & Next Steps</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0A0D14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      line-height: 1.6;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #001647;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      overflow: hidden;
    }
    .header-banner {
      background: linear-gradient(135deg, #001647 0%, #06286E 100%);
      padding: 40px 32px 30px;
      border-bottom: 2px solid #D4AF37;
      text-align: left;
    }
    .brand-eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #D4AF37;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 24px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .header-subtitle {
      font-size: 14px;
      color: #94A3B8;
      margin: 0;
    }
    .content-body {
      padding: 36px 32px;
      background-color: #021B54;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .paragraph {
      font-size: 15px;
      color: #CBD5E1;
      margin-bottom: 18px;
      line-height: 1.65;
    }
    .scripture-card {
      background: rgba(0, 0, 0, 0.35);
      border-left: 4px solid #10B981;
      padding: 18px 20px;
      margin: 24px 0;
      border-radius: 2px;
    }
    .scripture-text {
      font-size: 15px;
      font-style: italic;
      color: #F1F5F9;
      margin: 0 0 6px 0;
      line-height: 1.5;
    }
    .scripture-ref {
      font-size: 12px;
      font-weight: 600;
      color: #10B981;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .segment-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 24px;
      margin: 28px 0;
      border-radius: 4px;
    }
    .segment-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #D4AF37;
      margin-bottom: 8px;
    }
    .segment-title {
      font-size: 19px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 10px 0;
    }
    .segment-desc {
      font-size: 14px;
      color: #CBD5E1;
      margin-bottom: 18px;
    }
    .section-heading {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #F8FAFC;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 6px;
    }
    .steps-list {
      margin: 0 0 20px 0;
      padding-left: 18px;
    }
    .steps-list li {
      font-size: 14px;
      color: #CBD5E1;
      margin-bottom: 8px;
    }
    .track-item {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 18px;
      margin-bottom: 12px;
      border-radius: 3px;
    }
    .track-title {
      font-size: 15px;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0 0 4px 0;
    }
    .track-desc {
      font-size: 13px;
      color: #94A3B8;
      margin: 0 0 10px 0;
    }
    .track-btn {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #001647;
      background-color: #10B981;
      padding: 8px 14px;
      text-decoration: none;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .signature-box {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .signoff {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .author-name {
      font-size: 16px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }
    .author-role {
      font-size: 13px;
      color: #D4AF37;
      margin: 2px 0 0 0;
    }
    .footer {
      padding: 24px 32px;
      background-color: #001133;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #64748B;
      text-align: left;
    }
    .footer a {
      color: #94A3B8;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="email-wrapper">
      
      <!-- Header -->
      <div class="header-banner">
        <div class="brand-eyebrow">Glory Adeniran · Spiritual Reflections</div>
        <h1 class="header-title">Beyond Performance</h1>
        <p class="header-subtitle">Redefining Prayer &amp; Bible Connection</p>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        <div class="greeting">Hello ${firstName},</div>
        
        <p class="paragraph">
          Thank you for taking the time to share your honest thoughts and reflections. Prayer was never meant to be an exhausting performance, a rigid routine, or an endurance test against a stopwatch. It is fundamentally an unhurried, honest conversation with God.
        </p>

        <p class="paragraph">
          We received your survey submission and have curated a set of personalized insights and recommended study tracks aligned with your specific responses.
        </p>

        <!-- Scripture Anchor -->
        <div class="scripture-card">
          <p class="scripture-text">"Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls."</p>
          <div class="scripture-ref">Matthew 11:28-29</div>
        </div>

        <!-- Segment Focus -->
        <div class="segment-card">
          <div class="segment-tag">Personalized Focus Pathway</div>
          <h2 class="segment-title">${segmentMeta.title}</h2>
          <p class="segment-desc">${segmentMeta.summary}</p>
          
          <div class="section-heading">Suggested Relational Steps</div>
          <ul class="steps-list">
            ${segmentMeta.actionSteps.map((step) => `<li>${step}</li>`).join('')}
          </ul>

          <div class="section-heading">Curated YouVersion Bible App Plans</div>
          ${segmentMeta.youVersionTracks.map((track) => `
            <div class="track-item">
              <div class="track-title">${track.title}</div>
              <div class="track-desc">${track.description}</div>
              <a href="${track.url}" class="track-btn" target="_blank" rel="noopener noreferrer">Open Reading Plan</a>
            </div>
          `).join('')}
        </div>

        <!-- Anchor of Peace -->
        <div class="scripture-card" style="border-left-color: #D4AF37;">
          <p class="scripture-text">"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</p>
          <div class="scripture-ref" style="color: #D4AF37;">Philippians 4:6-7</div>
        </div>

        <p class="paragraph">
          If you ever want to discuss these reflections, share feedback, or connect one-on-one, you can reply directly to this email or reach out through my personal website.
        </p>

        <!-- Signature -->
        <div class="signature-box">
          <div class="signoff">With peace and grace,</div>
          <div class="author-name">Glory Adeniran</div>
          <div class="author-role">Product Designer &amp; Creative Lead · gloryadeniran.cv</div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">
          You are receiving this one-time message because you completed the "Beyond Performance" reflection at <a href="https://gloryadeniran.cv/beyond-performance">gloryadeniran.cv</a>.
        </p>
        <p style="margin: 0;">
          Confidentiality Commitment: Your personal information is strictly protected and will never be shared, sold, or distributed to third parties.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}
