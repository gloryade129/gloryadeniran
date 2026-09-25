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
      academic_rating_100l: Number(data.academicRating100L) || 5,
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
      cr_communication: Number(data.crRatingCommunication) || 5,
      cr_materials: Number(data.crRatingMaterials) || 5,
      cr_availability: Number(data.crRatingAvailability) || 5,
      cr_welfare: Number(data.crRatingWelfare) || 5,
      acr_communication: Number(data.acrRatingCommunication) || 5,
      acr_materials: Number(data.acrRatingMaterials) || 5,
      acr_availability: Number(data.acrRatingAvailability) || 5,
      acr_welfare: Number(data.acrRatingWelfare) || 5,
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
      academicRating100L: p.academic_rating_100l,
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

      const crRecommendContinue = f.cr_recommend_continue || matchedProfile?.crRecommendContinue || '';
      const crRecommendReason = f.cr_recommend_reason || matchedProfile?.crRecommendReason || '';
      const acrRecommendContinue = f.acr_recommend_continue || matchedProfile?.acrRecommendContinue || '';
      const acrRecommendReason = f.acr_recommend_reason || matchedProfile?.acrRecommendReason || '';

      const suggestions200L = matchedProfile?.suggestions200L || '';
      const supportNote = matchedProfile?.supportNote || '';
      const challenges100L = matchedProfile?.challenges100L || [];

      // Compute overall score average across all 8 metrics if not already stored
      const crComm = Number(f.cr_communication) || 5;
      const crMat = Number(f.cr_materials) || 5;
      const crAvail = Number(f.cr_availability) || 5;
      const crWelf = Number(f.cr_welfare) || 5;
      const acrComm = Number(f.acr_communication) || 5;
      const acrMat = Number(f.acr_materials) || 5;
      const acrAvail = Number(f.acr_availability) || 5;
      const acrWelf = Number(f.acr_welfare) || 5;

      const sumScores = crComm + crMat + crAvail + crWelf + acrComm + acrMat + acrAvail + acrWelf;
      const computedOverall = Math.round((sumScores / 8) * 100) / 100;
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

