/**
 * src/lib/it-dept-db.js
 * Supabase client and storage layer for IT Dept (2025-2029 Set).
 */

const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_SUPABASE_URL ||
  ''
).replace(/\/$/, '');

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

/**
 * Persists student profile and leadership review to Supabase
 */
export async function saveStudentSubmission(data) {
  const normalizedMatric = (data.matricNo || '').trim().toUpperCase();
  const normalizedEmail = (data.email || '').trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    console.warn('[it-dept-db] Supabase credentials not set in environment. Storing locally.');
    return { success: true, profileId: `local-${Date.now()}`, isDemo: true };
  }

  try {
    // 1. Check for existing email (Single submission enforcement via email)
    if (normalizedEmail) {
      const emailCheckRes = await fetch(
        `${supabaseUrl}/rest/v1/students_profile?email=ilike.${encodeURIComponent(normalizedEmail)}&select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      );

      if (emailCheckRes.ok) {
        const existingEmail = await emailCheckRes.json();
        if (Array.isArray(existingEmail) && existingEmail.length > 0) {
          return { success: false, error: 'EMAIL_EXISTS' };
        }
      }
    }

    // 2. Check for existing matric
    if (normalizedMatric) {
      const matricCheckRes = await fetch(
        `${supabaseUrl}/rest/v1/students_profile?matric_no=ilike.${encodeURIComponent(normalizedMatric)}&select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      );

      if (matricCheckRes.ok) {
        const existingMatric = await matricCheckRes.json();
        if (Array.isArray(existingMatric) && existingMatric.length > 0) {
          return { success: false, error: 'MATRIC_EXISTS' };
        }
      }
    }

    // 3. Insert Student Profile
    const profileRecord = {
      full_name: data.fullName?.trim(),
      matric_no: normalizedMatric,
      email: normalizedEmail,
      phone: data.phone?.trim(),
      birthday: `${data.birthDay} Month ${data.birthMonth}`,
      birth_day: Number(data.birthDay),
      birth_month: Number(data.birthMonth),
      tech_track: data.techTrack,
      academic_rating_100l: Number(data.academicRating100L) || 0,
      favorite_courses: data.favoriteCourses || [],
      toughest_courses: data.toughestCourses || [],
      challenges_100l: data.challenges100L || [],
      committees: data.committees || [],
      volunteer_roles: data.volunteerRoles || [],
      cr_recommend_continue: data.crRecommendContinue || '',
      cr_recommend_reason: data.crRecommendReason || '',
      acr_recommend_continue: data.acrRecommendContinue || '',
      acr_recommend_reason: data.acrRecommendReason || '',
      support_choice: data.supportLeadershipChoice || 'no',
      support_amount: Number(data.supportAmount) || 0,
      payment_status: data.paymentStatus || 'unpaid',
      payment_ref: data.paymentRef || '',
      support_note: data.supportNote || '',
      suggestions_200l: (data.suggestions200L || data.vision200L || '').trim(),
    };

    let profileRes = await fetch(`${supabaseUrl}/rest/v1/students_profile`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(profileRecord),
    });

    // If new columns are not yet in Supabase schema cache, retry safely by embedding in suggestions
    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.warn('[it-dept-db] Profile insert initial attempt note:', errText);
      if (errText.includes('email') || errText.includes('idx_students_profile_email')) {
        return { success: false, error: 'EMAIL_EXISTS' };
      }
      if (errText.includes('matric_no') || errText.includes('idx_students_profile_matric')) {
        return { success: false, error: 'MATRIC_EXISTS' };
      }

      // Fallback: strip new columns and embed in suggestions_200l
      const fallbackRecord = { ...profileRecord };
      delete fallbackRecord.cr_recommend_continue;
      delete fallbackRecord.cr_recommend_reason;
      delete fallbackRecord.acr_recommend_continue;
      delete fallbackRecord.acr_recommend_reason;
      fallbackRecord.suggestions_200l = `${data.suggestions200L || data.vision200L || ''}\n[CR Continue: ${(data.crRecommendContinue || '').toUpperCase()}] Reason: ${data.crRecommendReason || ''}\n[ACR Esther Continue: ${(data.acrRecommendContinue || '').toUpperCase()}] Reason: ${data.acrRecommendReason || ''}`.trim();

      profileRes = await fetch(`${supabaseUrl}/rest/v1/students_profile`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(fallbackRecord),
      });

      if (!profileRes.ok) {
        const secondErr = await profileRes.text();
        return { success: false, error: secondErr };
      }
    }

    const insertedProfile = await profileRes.json();
    const profileId = Array.isArray(insertedProfile) ? insertedProfile[0]?.id : insertedProfile?.id;

    // 4. Insert Leadership Review (Decoupled Anonymity)
    const isAnonymous = Boolean(data.isAnonymousLeadership || data.isAnonymousFeedback);
    const wellDoneVal = (data.leadershipWellDone || data.leadershipPraises || data.wellDone || data.positiveShoutout || '').trim();
    const criticalAreasVal = (data.leadershipCriticalAreas || data.leadershipImprovements || data.criticalAreas || data.qualitativeCritique || '').trim();

    const feedbackRecord = {
      student_id: isAnonymous ? null : profileId,
      is_anonymous: isAnonymous,
      cr_communication: Number(data.crRatingCommunication) || 0,
      cr_materials: Number(data.crRatingMaterials) || 0,
      cr_availability: Number(data.crRatingAvailability) || 0,
      cr_welfare: Number(data.crRatingWelfare) || 0,
      acr_communication: Number(data.acrRatingCommunication) || 0,
      acr_materials: Number(data.acrRatingMaterials) || 0,
      acr_availability: Number(data.acrRatingAvailability) || 0,
      acr_welfare: Number(data.acrRatingWelfare) || 0,
      well_done: wellDoneVal,
      critical_areas: criticalAreasVal,
      cr_recommend_continue: data.crRecommendContinue || '',
      cr_recommend_reason: data.crRecommendReason || '',
      acr_recommend_continue: data.acrRecommendContinue || '',
      acr_recommend_reason: data.acrRecommendReason || '',
    };

    let feedbackRes = await fetch(`${supabaseUrl}/rest/v1/leadership_feedback`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackRecord),
    });

    if (!feedbackRes.ok) {
      // Fallback: strip new columns and embed in critical_areas
      const fallbackFeedback = { ...feedbackRecord };
      delete fallbackFeedback.cr_recommend_continue;
      delete fallbackFeedback.cr_recommend_reason;
      delete fallbackFeedback.acr_recommend_continue;
      delete fallbackFeedback.acr_recommend_reason;
      const critiqueNote = criticalAreasVal || '';
      fallbackFeedback.critical_areas = `${critiqueNote}\n[CR Continue: ${(data.crRecommendContinue || '').toUpperCase()}] Reason: ${data.crRecommendReason || ''}\n[ACR Esther Continue: ${(data.acrRecommendContinue || '').toUpperCase()}] Reason: ${data.acrRecommendReason || ''}`.trim();

      await fetch(`${supabaseUrl}/rest/v1/leadership_feedback`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackFeedback),
      });
    }

    return { success: true, profileId };
  } catch (err) {
    console.error('[it-dept-db] Exception saving submission:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches all student profiles and feedback for Admin Dashboard
 */
export async function getAdminData() {
  if (!isSupabaseConfigured()) {
    return { profiles: [], feedbacks: [], isDemo: true };
  }

  try {
    const [profilesRes, feedbacksRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/students_profile?select=*&order=created_at.desc&limit=500`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store',
      }),
      fetch(`${supabaseUrl}/rest/v1/leadership_feedback?select=*&order=created_at.desc&limit=500`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store',
      }),
    ]);

    const rawProfiles = profilesRes.ok ? await profilesRes.json() : [];
    const rawFeedbacks = feedbacksRes.ok ? await feedbacksRes.json() : [];

    // Map to DTO shape
    const profiles = (Array.isArray(rawProfiles) ? rawProfiles : []).map(p => ({
      id: p.id,
      fullName: p.full_name,
      matricNo: p.matric_no,
      email: p.email || '',
      phone: p.phone,
      birthdayString: p.birthday,
      birthDay: p.birth_day,
      birthMonth: p.birth_month,
      techTrack: p.tech_track,
      academicRating100L: Number(p.academic_rating_100l) || 0,
      favoriteCourses: p.favorite_courses || [],
      toughestCourses: p.toughest_courses || [],
      challenges100L: p.challenges_100l || [],
      committees: p.committees || [],
      volunteerRoles: p.volunteer_roles || [],
      supportChoice: p.support_choice || 'no',
      supportAmount: Number(p.support_amount) || 0,
      paymentStatus: p.payment_status || 'unpaid',
      paymentRef: p.payment_ref || '',
      supportNote: p.support_note || '',
      suggestions200L: p.suggestions_200l || '',
      crRecommendContinue: p.cr_recommend_continue || '',
      crRecommendReason: p.cr_recommend_reason || '',
      acrRecommendContinue: p.acr_recommend_continue || '',
      acrRecommendReason: p.acr_recommend_reason || '',
      createdAt: p.created_at,
    }));

    // Build lookup map by profile ID for lightning-fast join
    const profilesById = new Map();
    for (const p of profiles) {
      if (p.id) profilesById.set(p.id, p);
    }

    const feedbacks = (Array.isArray(rawFeedbacks) ? rawFeedbacks : []).map(f => {
      const matchedProfile = f.student_id ? profilesById.get(f.student_id) : null;
      const isAnon = Boolean(f.is_anonymous || !f.student_id);

      const wellDone = (
        f.well_done ||
        f.positive_shoutout ||
        f.leadership_well_done ||
        f.leadership_praises ||
        ''
      ).trim();

      const criticalAreas = (
        f.critical_areas ||
        f.qualitative_critique ||
        f.leadership_critical_areas ||
        f.leadership_improvements ||
        ''
      ).trim();

      let crRecommendContinue = f.cr_recommend_continue || matchedProfile?.crRecommendContinue || '';
      let crRecommendReason = f.cr_recommend_reason || matchedProfile?.crRecommendReason || '';
      let acrRecommendContinue = f.acr_recommend_continue || matchedProfile?.acrRecommendContinue || '';
      let acrRecommendReason = f.acr_recommend_reason || matchedProfile?.acrRecommendReason || '';

      // Fallback regex extraction if embedded in critical_areas or suggestions_200l
      if (!crRecommendContinue) {
        const textSource = `${criticalAreas} ${matchedProfile?.suggestions200L || ''}`;
        const crMatch = textSource.match(/\[CR Continue:\s*([A-Za-z]+)\](?:\s*Reason:\s*([^\[\n\r]+))?/i);
        if (crMatch) {
          crRecommendContinue = crMatch[1].toLowerCase();
          if (!crRecommendReason && crMatch[2]) crRecommendReason = crMatch[2].trim();
        }
      }
      if (!acrRecommendContinue) {
        const textSource = `${criticalAreas} ${matchedProfile?.suggestions200L || ''}`;
        const acrMatch = textSource.match(/\[ACR Esther Continue:\s*([A-Za-z]+)\](?:\s*Reason:\s*([^\[\n\r]+))?/i);
        if (acrMatch) {
          acrRecommendContinue = acrMatch[1].toLowerCase();
          if (!acrRecommendReason && acrMatch[2]) acrRecommendReason = acrMatch[2].trim();
        }
      }

      const suggestions200L = matchedProfile?.suggestions200L || '';
      const supportNote = matchedProfile?.supportNote || '';
      const challenges100L = matchedProfile?.challenges100L || [];

      // Compute overall score average across non-zero ratings
      const crComm = Number(f.cr_communication) || 0;
      const crMat = Number(f.cr_materials) || 0;
      const crAvail = Number(f.cr_availability) || 0;
      const crWelf = Number(f.cr_welfare) || 0;
      const acrComm = Number(f.acr_communication) || 0;
      const acrMat = Number(f.acr_materials) || 0;
      const acrAvail = Number(f.acr_availability) || 0;
      const acrWelf = Number(f.acr_welfare) || 0;

      const nonZeroRatings = [crComm, crMat, crAvail, crWelf, acrComm, acrMat, acrAvail, acrWelf].filter(r => r > 0);
      const computedOverall = nonZeroRatings.length > 0
        ? Math.round((nonZeroRatings.reduce((a, b) => a + b, 0) / nonZeroRatings.length) * 100) / 100
        : 0;
      const finalScore = Number(f.overall_score) > 0 ? Number(f.overall_score) : computedOverall;

      return {
        id: f.id,
        studentId: f.student_id,
        isAnonymous: isAnon,
        studentName: isAnon ? '' : (matchedProfile?.fullName || ''),
        studentMatric: isAnon ? '' : (matchedProfile?.matricNo || ''),
        studentEmail: isAnon ? '' : (matchedProfile?.email || ''),
        studentPhone: isAnon ? '' : (matchedProfile?.phone || ''),
        techTrack: isAnon ? '' : (matchedProfile?.techTrack || ''),
        crCommunication: crComm,
        crMaterials: crMat,
        crAvailability: crAvail,
        crWelfare: crWelf,
        acrCommunication: acrComm,
        acrMaterials: acrMat,
        acrAvailability: acrAvail,
        acrWelfare: acrWelf,
        overallScore: finalScore,
        wellDone,
        criticalAreas,
        qualitativeCritique: criticalAreas,
        positiveShoutout: wellDone,
        suggestions200L,
        supportNote,
        challenges100L,
        crRecommendContinue,
        crRecommendReason,
        acrRecommendContinue,
        acrRecommendReason,
        createdAt: f.created_at,
      };
    });

    return { profiles, feedbacks, isDemo: false };
  } catch (err) {
    console.error('[it-dept-db] Error fetching admin data:', err);
    return { profiles: [], feedbacks: [], isDemo: true };
  }
}

/**
 * Updates payment status of a student profile by payment_ref
 */
export async function updatePaymentStatus(paymentRef, status = 'completed') {
  if (!isSupabaseConfigured() || !paymentRef) return { success: false };
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/students_profile?payment_ref=eq.${encodeURIComponent(paymentRef)}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_status: status }),
    });
    return { success: res.ok };
  } catch (err) {
    console.error('[it-dept-db] Error updating payment status:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a student profile and associated feedback from Supabase
 */
export async function deleteStudentSubmission(studentId, matricNo) {
  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  try {
    // 1. Delete associated feedback if student_id is set
    if (studentId) {
      await fetch(`${supabaseUrl}/rest/v1/leadership_feedback?student_id=eq.${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
    }

    // 2. Delete student profile by id or matric_no
    const query = studentId
      ? `id=eq.${encodeURIComponent(studentId)}`
      : `matric_no=ilike.${encodeURIComponent((matricNo || '').trim().toUpperCase())}`;

    const res = await fetch(`${supabaseUrl}/rest/v1/students_profile?${query}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[it-dept-db] Delete error:', errText);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err) {
    console.error('[it-dept-db] Exception deleting student:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks if an email or matric number already exists in Supabase
 */
export async function checkDuplicateStudent(email, matricNo) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedMatric = (matricNo || '').trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    return { exists: false };
  }

  try {
    if (normalizedEmail) {
      const emailRes = await fetch(
        `${supabaseUrl}/rest/v1/students_profile?email=ilike.${encodeURIComponent(normalizedEmail)}&select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      );
      if (emailRes.ok) {
        const rows = await emailRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return { exists: true, field: 'email', message: 'A submission with this email address has already been recorded.' };
        }
      }
    }

    if (normalizedMatric) {
      const matricRes = await fetch(
        `${supabaseUrl}/rest/v1/students_profile?matric_no=ilike.${encodeURIComponent(normalizedMatric)}&select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: 'no-store',
        }
      );
      if (matricRes.ok) {
        const rows = await matricRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return { exists: true, field: 'matric', message: 'This matriculation number has already submitted the survey.' };
        }
      }
    }

    return { exists: false };
  } catch (err) {
    console.error('[it-dept-db] Duplicate check exception:', err);
    return { exists: false };
  }
}

/**
 * Looks up an existing student submission by Matric Number (or Email)
 * for returning students wanting to answer the new questions
 */
export async function lookupStudentByMatric(matricNo, email) {
  const normalizedMatric = (matricNo || '').trim().toUpperCase();
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    return { found: false };
  }

  try {
    let query = '';
    if (normalizedMatric) {
      query = `matric_no=ilike.${encodeURIComponent(normalizedMatric)}`;
    } else if (normalizedEmail) {
      query = `email=ilike.${encodeURIComponent(normalizedEmail)}`;
    } else {
      return { found: false };
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/students_profile?${query}&select=*&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return { found: false };
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return { found: false };

    const profile = rows[0];

    // Also look up any existing leadership feedback
    let feedback = null;
    if (profile.id) {
      const fbRes = await fetch(`${supabaseUrl}/rest/v1/leadership_feedback?student_id=eq.${encodeURIComponent(profile.id)}&select=*&limit=1`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (fbRes.ok) {
        const fbRows = await fbRes.json();
        if (Array.isArray(fbRows) && fbRows.length > 0) {
          feedback = fbRows[0];
        }
      }
    }

    // Determine if student has already completed all questions (including continuation questions)
    let crCont = profile.cr_recommend_continue || feedback?.cr_recommend_continue || '';
    let crRsn = profile.cr_recommend_reason || feedback?.cr_recommend_reason || '';
    let acrCont = profile.acr_recommend_continue || feedback?.acr_recommend_continue || '';
    let acrRsn = profile.acr_recommend_reason || feedback?.acr_recommend_reason || '';

    // Check fallback text embeds
    const embeddedText = `${profile.suggestions_200l || ''} ${feedback?.critical_areas || ''}`;
    if (!crCont) {
      const crM = embeddedText.match(/\[CR Continue:\s*([A-Za-z]+)\](?:\s*Reason:\s*([^\[\n\r]+))?/i);
      if (crM) {
        crCont = crM[1].toLowerCase();
        if (!crRsn && crM[2]) crRsn = crM[2].trim();
      }
    }
    if (!acrCont) {
      const acrM = embeddedText.match(/\[ACR Esther Continue:\s*([A-Za-z]+)\](?:\s*Reason:\s*([^\[\n\r]+))?/i);
      if (acrM) {
        acrCont = acrM[1].toLowerCase();
        if (!acrRsn && acrM[2]) acrRsn = acrM[2].trim();
      }
    }

    const hasCompletedAll = Boolean(crCont && crCont.trim());

    return {
      found: true,
      hasCompletedAll,
      feedbackId: feedback?.id || null,
      student: {
        profileId: profile.id,
        feedbackId: feedback?.id || null,
        hasCompletedAll,
        fullName: profile.full_name,
        matricNo: profile.matric_no,
        email: profile.email || '',
        phone: profile.phone || '',
        birthDay: profile.birth_day || 1,
        birthMonth: profile.birth_month || 1,
        techTrack: profile.tech_track || '',
        academicRating100L: Number(profile.academic_rating_100l) || 0,
        favoriteCourses: profile.favorite_courses || [],
        toughestCourses: profile.toughest_courses || [],
        challenges100L: profile.challenges_100l || [],
        volunteerRoles: profile.volunteer_roles || profile.committees || [],
        committees: profile.committees || [],
        supportLeadershipChoice: profile.support_choice || 'no',
        supportAmount: Number(profile.support_amount) || 0,
        paymentStatus: profile.payment_status || 'unpaid',
        paymentRef: profile.payment_ref || '',
        supportNote: profile.support_note || '',
        suggestions200L: profile.suggestions_200l || '',
        vision200L: profile.suggestions_200l || '',
        crRecommendContinue: crCont,
        crRecommendReason: crRsn,
        acrRecommendContinue: acrCont,
        acrRecommendReason: acrRsn,
        crRatingCommunication: Number(feedback?.cr_communication) || 0,
        crRatingMaterials: Number(feedback?.cr_materials) || 0,
        crRatingAvailability: Number(feedback?.cr_availability) || 0,
        crRatingWelfare: Number(feedback?.cr_welfare) || 0,
        acrRatingCommunication: Number(feedback?.acr_communication) || 0,
        acrRatingMaterials: Number(feedback?.acr_materials) || 0,
        acrRatingAvailability: Number(feedback?.acr_availability) || 0,
        acrRatingWelfare: Number(feedback?.acr_welfare) || 0,
        leadershipWellDone: feedback?.well_done || '',
        leadershipPraises: feedback?.well_done || '',
        leadershipCriticalAreas: feedback?.critical_areas || '',
        leadershipImprovements: feedback?.critical_areas || '',
        isAnonymousLeadership: Boolean(feedback?.is_anonymous),
        isAnonymousFeedback: Boolean(feedback?.is_anonymous),
      },
    };
  } catch (err) {
    console.error('[it-dept-db] lookupStudentByMatric error:', err);
    return { found: false, error: err.message };
  }
}

/**
 * Updates an existing student submission with answers to the new questions
 * (e.g. CR & ACR continuation recommendations, updated comments, suggestions)
 */
export async function updateStudentSubmission(data) {
  const profileId = data.profileId;
  const normalizedMatric = (data.matricNo || '').trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    return { success: true, isDemo: true };
  }

  try {
    // 1. Update students_profile record
    const profileUpdates = {
      cr_recommend_continue: data.crRecommendContinue || '',
      cr_recommend_reason: data.crRecommendReason || '',
      acr_recommend_continue: data.acrRecommendContinue || '',
      acr_recommend_reason: data.acrRecommendReason || '',
      volunteer_roles: data.volunteerRoles || [],
      suggestions_200l: (data.suggestions200L || data.vision200L || '').trim(),
      updated_at: new Date().toISOString(),
    };

    if (data.supportLeadershipChoice) profileUpdates.support_choice = data.supportLeadershipChoice;
    if (data.supportAmount !== undefined) profileUpdates.support_amount = Number(data.supportAmount) || 0;
    if (data.supportNote) profileUpdates.support_note = data.supportNote;

    const profileQuery = profileId
      ? `id=eq.${encodeURIComponent(profileId)}`
      : `matric_no=ilike.${encodeURIComponent(normalizedMatric)}`;

    let profilePatchRes = await fetch(`${supabaseUrl}/rest/v1/students_profile?${profileQuery}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileUpdates),
    });

    // If new columns failed schema cache, embed in suggestions_200l
    if (!profilePatchRes.ok) {
      const fallbackUpdates = { ...profileUpdates };
      delete fallbackUpdates.cr_recommend_continue;
      delete fallbackUpdates.cr_recommend_reason;
      delete fallbackUpdates.acr_recommend_continue;
      delete fallbackUpdates.acr_recommend_reason;
      fallbackUpdates.suggestions_200l = `${data.suggestions200L || data.vision200L || ''}\n[CR Continue: ${(data.crRecommendContinue || '').toUpperCase()}] Reason: ${data.crRecommendReason || ''}\n[ACR Esther Continue: ${(data.acrRecommendContinue || '').toUpperCase()}] Reason: ${data.acrRecommendReason || ''}`.trim();

      await fetch(`${supabaseUrl}/rest/v1/students_profile?${profileQuery}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackUpdates),
      });
    }

    // 2. Update or Upsert leadership_feedback record
    const isAnonymous = Boolean(data.isAnonymousLeadership || data.isAnonymousFeedback);
    const wellDoneVal = (data.leadershipWellDone || data.leadershipPraises || data.wellDone || '').trim();
    const criticalAreasVal = (data.leadershipCriticalAreas || data.leadershipImprovements || data.criticalAreas || '').trim();

    const feedbackUpdates = {
      cr_communication: Number(data.crRatingCommunication) || 0,
      cr_materials: Number(data.crRatingMaterials) || 0,
      cr_availability: Number(data.crRatingAvailability) || 0,
      cr_welfare: Number(data.crRatingWelfare) || 0,
      acr_communication: Number(data.acrRatingCommunication) || 0,
      acr_materials: Number(data.acrRatingMaterials) || 0,
      acr_availability: Number(data.acrRatingAvailability) || 0,
      acr_welfare: Number(data.acrRatingWelfare) || 0,
      well_done: wellDoneVal,
      critical_areas: criticalAreasVal,
      cr_recommend_continue: data.crRecommendContinue || '',
      cr_recommend_reason: data.crRecommendReason || '',
      acr_recommend_continue: data.acrRecommendContinue || '',
      acr_recommend_reason: data.acrRecommendReason || '',
    };

    let targetFeedbackId = data.feedbackId;

    if (!targetFeedbackId && profileId) {
      // Find existing feedback row by student_id
      const checkFbRes = await fetch(`${supabaseUrl}/rest/v1/leadership_feedback?student_id=eq.${encodeURIComponent(profileId)}&select=id&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store',
      });
      if (checkFbRes.ok) {
        const rows = await checkFbRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          targetFeedbackId = rows[0].id;
        }
      }
    }

    if (targetFeedbackId) {
      // Direct PATCH to existing row - completely avoids duplicate inserts
      let fbPatchRes = await fetch(`${supabaseUrl}/rest/v1/leadership_feedback?id=eq.${encodeURIComponent(targetFeedbackId)}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackUpdates),
      });

      if (!fbPatchRes.ok) {
        // Fallback: strip continuation columns and embed in critical_areas
        const fallbackFb = { ...feedbackUpdates };
        delete fallbackFb.cr_recommend_continue;
        delete fallbackFb.cr_recommend_reason;
        delete fallbackFb.acr_recommend_continue;
        delete fallbackFb.acr_recommend_reason;
        fallbackFb.critical_areas = `${criticalAreasVal}\n[CR Continue: ${(data.crRecommendContinue || '').toUpperCase()}] Reason: ${data.crRecommendReason || ''}\n[ACR Esther Continue: ${(data.acrRecommendContinue || '').toUpperCase()}] Reason: ${data.acrRecommendReason || ''}`.trim();

        await fetch(`${supabaseUrl}/rest/v1/leadership_feedback?id=eq.${encodeURIComponent(targetFeedbackId)}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fallbackFb),
        });
      }
    } else if (profileId) {
      // Insert fresh feedback row linked to this profile
      const newFb = {
        ...feedbackUpdates,
        student_id: profileId,
        is_anonymous: isAnonymous,
      };
      await fetch(`${supabaseUrl}/rest/v1/leadership_feedback`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFb),
      });
    }

    return { success: true, profileId };
  } catch (err) {
    console.error('[it-dept-db] Exception updating student submission:', err);
    return { success: false, error: err.message };
  }
}


