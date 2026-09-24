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
      support_choice: data.supportLeadershipChoice || 'no',
      support_amount: Number(data.supportAmount) || 0,
      payment_status: data.paymentStatus || 'unpaid',
      payment_ref: data.paymentRef || '',
      support_note: data.supportNote || '',
      suggestions_200l: data.suggestions200L || '',
    };

    const profileRes = await fetch(`${supabaseUrl}/rest/v1/students_profile`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(profileRecord),
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('[it-dept-db] Profile insert error:', errText);
      if (errText.includes('email') || errText.includes('idx_students_profile_email')) {
        return { success: false, error: 'EMAIL_EXISTS' };
      }
      if (errText.includes('matric_no') || errText.includes('idx_students_profile_matric')) {
        return { success: false, error: 'MATRIC_EXISTS' };
      }
      return { success: false, error: errText };
    }

    const insertedProfile = await profileRes.json();
    const profileId = Array.isArray(insertedProfile) ? insertedProfile[0]?.id : insertedProfile?.id;

    // 3. Insert Leadership Review (Decoupled Anonymity)
    const feedbackRecord = {
      student_id: data.isAnonymousLeadership ? null : profileId,
      is_anonymous: Boolean(data.isAnonymousLeadership),
      cr_communication: Number(data.crRatingCommunication) || 5,
      cr_materials: Number(data.crRatingMaterials) || 5,
      cr_availability: Number(data.crRatingAvailability) || 5,
      cr_welfare: Number(data.crRatingWelfare) || 5,
      acr_communication: Number(data.acrRatingCommunication) || 5,
      acr_materials: Number(data.acrRatingMaterials) || 5,
      acr_availability: Number(data.acrRatingAvailability) || 5,
      acr_welfare: Number(data.acrRatingWelfare) || 5,
      well_done: data.leadershipWellDone || data.wellDone || data.positiveShoutout || '',
      critical_areas: data.leadershipCriticalAreas || data.criticalAreas || data.qualitativeCritique || '',
    };

    await fetch(`${supabaseUrl}/rest/v1/leadership_feedback`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackRecord),
    });

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
      createdAt: p.created_at,
    }));

    const feedbacks = (Array.isArray(rawFeedbacks) ? rawFeedbacks : []).map(f => ({
      id: f.id,
      studentId: f.student_id,
      isAnonymous: f.is_anonymous,
      crCommunication: f.cr_communication,
      crMaterials: f.cr_materials,
      crAvailability: f.cr_availability,
      crWelfare: f.cr_welfare,
      acrCommunication: f.acr_communication,
      acrMaterials: f.acr_materials,
      acrAvailability: f.acr_availability,
      acrWelfare: f.acr_welfare,
      wellDone: f.well_done || f.positive_shoutout || '',
      criticalAreas: f.critical_areas || f.qualitative_critique || '',
      qualitativeCritique: f.critical_areas || f.qualitative_critique || '',
      positiveShoutout: f.well_done || f.positive_shoutout || '',
      overallScore: f.overall_score || 5.0,
      createdAt: f.created_at,
    }));

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

