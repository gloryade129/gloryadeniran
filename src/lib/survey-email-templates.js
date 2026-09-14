/**
 * lib/survey-email-templates.js
 * Generates responsive, elegant HTML confirmation and follow-up emails
 * tailored by spiritual segment. Strictly zero emojis.
 * Features Glory Adeniran (God's Virtue) with Christlike atmospheric styling.
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
  } = entry;

  const segmentMeta = getSegmentMetadata(assigned_segment);
  const firstName = full_name ? full_name.split(' ')[0] : 'Friend';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Reflection on Prayer &amp; Next Steps</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080706;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #FAFAFA;
      line-height: 1.6;
    }
    .email-wrapper {
      max-width: 620px;
      margin: 0 auto;
      background-color: #0E0E10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    .header-banner {
      background: #080706;
      padding: 40px 32px 28px;
      border-bottom: 2px solid #0091FF;
      text-align: left;
    }
    .brand-eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #0091FF;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 26px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 6px 0;
      line-height: 1.25;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      font-size: 13.5px;
      color: #9A9994;
      margin: 0;
    }
    .content-body {
      padding: 36px 32px;
      background-color: #0E0E10;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .paragraph {
      font-size: 14.5px;
      color: #C8C7C2;
      margin-bottom: 18px;
      line-height: 1.65;
    }
    .scripture-card {
      background: rgba(0, 145, 255, 0.05);
      border-left: 3px solid #0091FF;
      padding: 18px 20px;
      margin: 24px 0;
    }
    .scripture-text {
      font-size: 14.5px;
      font-style: italic;
      color: #FAFAFA;
      margin: 0 0 6px 0;
      line-height: 1.55;
    }
    .scripture-ref {
      font-size: 11px;
      font-weight: 700;
      color: #0091FF;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .segment-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 2px solid #0091FF;
      padding: 24px;
      margin: 28px 0;
    }
    .segment-tag {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0091FF;
      margin-bottom: 8px;
    }
    .segment-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 10px 0;
    }
    .segment-desc {
      font-size: 14px;
      color: #C8C7C2;
      margin-bottom: 18px;
      line-height: 1.6;
    }
    .section-heading {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #FAFAFA;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }
    .steps-list {
      margin: 0 0 20px 0;
      padding-left: 18px;
    }
    .steps-list li {
      font-size: 13.5px;
      color: #C8C7C2;
      margin-bottom: 8px;
    }
    .track-item {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 14px 18px;
      margin-bottom: 12px;
    }
    .track-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0 0 4px 0;
    }
    .track-desc {
      font-size: 13px;
      color: #9A9994;
      margin: 0 0 10px 0;
    }
    .track-btn {
      display: inline-block;
      font-size: 11.5px;
      font-weight: 600;
      color: #080706;
      background-color: #0091FF;
      padding: 8px 14px;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .whatsapp-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .whatsapp-btn {
      display: inline-block;
      background: #0091FF;
      color: #080706;
      padding: 10px 22px;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
    }
    .signature-box {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .signoff {
      font-size: 13.5px;
      color: #9A9994;
      margin-bottom: 4px;
    }
    .author-name {
      font-size: 16px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }
    .author-role {
      font-size: 12.5px;
      color: #0091FF;
      margin: 2px 0 0 0;
    }
    .footer {
      padding: 24px 32px;
      background-color: #080706;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11.5px;
      color: #9A9994;
    }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="email-wrapper">
      
      <!-- Header Banner -->
      <div class="header-banner">
        <div class="brand-eyebrow">Glory Adeniran (God's Virtue) · Beyond Performance</div>
        <h1 class="header-title">Beyond Performance</h1>
        <p class="header-subtitle">Redefining Prayer &amp; Bible Connection · Freedom from Stopwatch Legalism</p>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        <div class="greeting">Hello ${firstName},</div>
        
        <p class="paragraph">
          Thank you so much for taking the time to share your real heart and honest reflection. I want to reassure you directly: prayer was never designed to be an exhausting performance, a religious routine, or a test of endurance against a stopwatch. It is fundamentally an unforced, honest conversation with a Father who loves you deeply.
        </p>

        <!-- Scripture Anchor -->
        <div class="scripture-card">
          <p class="scripture-text">"Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls."</p>
          <div class="scripture-ref">Matthew 11:28-29</div>
        </div>

        <!-- Segment Personalized Focus -->
        <div class="segment-card">
          <div class="segment-tag">Your Personalized Reflection Focus</div>
          <h2 class="segment-title">${segmentMeta.title}</h2>
          <p class="segment-desc">${segmentMeta.summary}</p>
          
          <div class="section-heading">Suggested Practical Next Steps</div>
          <ul class="steps-list">
            ${segmentMeta.actionSteps.map((step) => `<li>${step}</li>`).join('')}
          </ul>

          <div class="section-heading">Curated YouVersion Bible App Study Tracks</div>
          ${segmentMeta.youVersionTracks.map((track) => `
            <div class="track-item">
              <div class="track-title">${track.title}</div>
              <div class="track-desc">${track.description}</div>
              <a href="${track.url}" class="track-btn" target="_blank" rel="noopener noreferrer">Open Plan in Bible App</a>
            </div>
          `).join('')}
        </div>

        <!-- Direct Contact & Prayer Assistance -->
        <div class="whatsapp-card">
          <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #FFFFFF;">Need 1-on-1 Prayer, Encouragement, or Study Guidance?</p>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #9A9994;">I am always glad to pray with you or discuss questions about returning to peaceful communion with God.</p>
          <a href="https://wa.me/2349168047236" class="whatsapp-btn" target="_blank">Connect with Glory on WhatsApp</a>
        </div>

        <!-- Philippians Anchor -->
        <div class="scripture-card">
          <p class="scripture-text">"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."</p>
          <div class="scripture-ref">Philippians 4:6-7</div>
        </div>

        <!-- Signature -->
        <div class="signature-box">
          <div class="signoff">With brotherly love and grace,</div>
          <div class="author-name">Glory Adeniran (God's Virtue)</div>
          <div class="author-role">Product Designer &amp; Creative Lead · gloryadeniran.cv</div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">
          You are receiving this personal reflection summary because you completed the "Beyond Performance" reflection at <a href="https://gloryadeniran.cv/beyond-performance" style="color: #0091FF;">gloryadeniran.cv</a>.
        </p>
        <p style="margin: 0;">
          Confidentiality Commitment: Your personal responses remain completely private and confidential.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}
