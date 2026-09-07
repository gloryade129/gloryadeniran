/**
 * API Route: /api/beyond-performance/submit
 * Handles submission, server-side RFC email validation, segmentation tag computation,
 * Supabase upsert (with Upstash Redis backup), and automated Brevo email dispatch.
 */

import { NextResponse } from 'next/server';
import { deriveSegment, getSegmentMetadata } from '@/lib/survey-segmentation';
import { upsertSurveyEntry, markSurveyEmailSent } from '@/lib/supabase';
import { buildSurveyFollowUpEmail } from '@/lib/survey-email-templates';
import { sendEmail } from '@/lib/brevo';

// RFC 5322 compliant regex for basic email format verification
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      privacy_accepted,
      full_name,
      email,
      faith_status,
      church_name,
      prayer_reality,
      prayer_friction_points,
      openness_rating,
      bible_reading_status,
      preferred_formats,
      open_reflection,
    } = body || {};

    // 1. Mandatory Validations
    if (!privacy_accepted) {
      return NextResponse.json(
        { error: 'Privacy acknowledgment and consent must be accepted to proceed.' },
        { status: 400 }
      );
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide your full name (at least 2 characters).' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid, standard email address.' },
        { status: 400 }
      );
    }

    if (!faith_status || typeof faith_status !== 'string') {
      return NextResponse.json(
        { error: 'Please select your current faith journey.' },
        { status: 400 }
      );
    }

    if (!prayer_reality || typeof prayer_reality !== 'string') {
      return NextResponse.json(
        { error: 'Please select your current reality with daily prayer.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(prayer_friction_points) || prayer_friction_points.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one primary friction point in prayer.' },
        { status: 400 }
      );
    }

    const rating = Number(openness_rating);
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Please provide an openness rating between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!bible_reading_status || typeof bible_reading_status !== 'string') {
      return NextResponse.json(
        { error: 'Please select your current experience with Bible reading.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(preferred_formats) || preferred_formats.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one preferred format for spiritual growth.' },
        { status: 400 }
      );
    }

    // 2. Segment Computation
    const assigned_segment = deriveSegment({
      prayer_friction_points,
      prayer_reality,
      faith_status,
      bible_reading_status,
    });

    const segmentMeta = getSegmentMetadata(assigned_segment);

    // 3. Store in Supabase / Redis
    const entryData = {
      full_name: full_name.trim(),
      email: cleanEmail,
      faith_status,
      church_name: church_name ? church_name.trim() : null,
      prayer_reality,
      prayer_friction_points,
      openness_rating: rating,
      bible_reading_status,
      preferred_formats,
      open_reflection: open_reflection ? open_reflection.trim() : null,
      assigned_segment,
    };

    const { data: savedRecord, fallbackUsed } = await upsertSurveyEntry(entryData);

    // 4. Dispatch Personalized Follow-Up Email via Brevo
    let emailSent = false;
    try {
      const htmlContent = buildSurveyFollowUpEmail({
        ...entryData,
        assigned_segment,
      });

      const emailResult = await sendEmail({
        to: cleanEmail,
        subject: 'Confirmation: Your Reflection on Prayer & Next Steps',
        htmlContent,
        sender: {
          name: 'Glory Adeniran',
          email: 'adeniranglory129@gmail.com',
        },
      });

      if (emailResult && emailResult.messageId) {
        emailSent = true;
        await markSurveyEmailSent(cleanEmail);
      }
    } catch (emailErr) {
      console.warn('[api/beyond-performance/submit] Email dispatch warning:', emailErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your reflection has been recorded successfully.',
        segment: assigned_segment,
        segmentTitle: segmentMeta.title,
        segmentSubtitle: segmentMeta.subtitle,
        scriptureAnchor: segmentMeta.scriptureAnchor,
        emailSent,
        fallbackUsed,
        recordId: savedRecord?.id || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/beyond-performance/submit] Unhandled submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your survey. Please try again.' },
      { status: 500 }
    );
  }
}
