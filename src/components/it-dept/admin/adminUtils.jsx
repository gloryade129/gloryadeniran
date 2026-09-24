'use client';
/**
 * IT Department Transition Portal (2025-2029 Set: 100L to 200L)
 * Admin Analytics Utilities & Calculation Engines
 */
import { CLASS_COMMITTEES, MONTH_NAMES } from '@/components/it-dept/types/survey';
export function sanitizePhoneNumber(phone) {
    if (!phone)
        return { international: '', local: '', isValid: false };
    // Strip all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Case 1: 11 digits starting with '0' (e.g. 08012345678, 09012345678, 07012345678)
    if (digits.length === 11 && digits.startsWith('0')) {
        const international = `234${digits.slice(1)}`;
        return { international: `+${international}`, local: digits, isValid: true };
    }
    // Case 2: 13 digits starting with '234' (e.g. 2348012345678)
    if (digits.length === 13 && digits.startsWith('234')) {
        return { international: `+${digits}`, local: `0${digits.slice(3)}`, isValid: true };
    }
    // Case 3: 10 digits without leading 0 (e.g. 8012345678)
    if (digits.length === 10 && /^[789]/.test(digits)) {
        return { international: `+234${digits}`, local: `0${digits}`, isValid: true };
    }
    // Case 4: General international format (10 to 15 digits)
    if (digits.length >= 10 && digits.length <= 15) {
        return { international: `+${digits}`, local: digits, isValid: true };
    }
    return { international: '', local: digits, isValid: false };
}
// ---------------------------------------------------------------------------
// 2. Chronological Birthday Calculations (Days Remaining)
// ---------------------------------------------------------------------------
export function calculateUpcomingBirthdays(students, referenceDate = new Date()) {
    const currentYear = referenceDate.getFullYear();
    const todayMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    return students
        .map(student => {
        const bMonth = Number(student.birthMonth) || 1;
        const bDay = Number(student.birthDay) || 1;
        // Construct next birthday date for current calendar year
        let nextBirthday = new Date(currentYear, bMonth - 1, bDay);
        // If birthday already passed this calendar year, roll over to next year
        if (nextBirthday.getTime() < todayMidnight.getTime()) {
            nextBirthday = new Date(currentYear + 1, bMonth - 1, bDay);
        }
        const diffMs = nextBirthday.getTime() - todayMidnight.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const isToday = daysRemaining === 0;
        const monthName = MONTH_NAMES[bMonth - 1] || `Month ${bMonth}`;
        return {
            fullName: student.fullName,
            matricNo: student.matricNo,
            phone: student.phone,
            birthDay: bDay,
            birthMonth: bMonth,
            monthName,
            daysRemaining,
            isToday,
        };
    })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
// ---------------------------------------------------------------------------
// 3. Admin KPI Calculations Engine
// ---------------------------------------------------------------------------
export function computeAdminKpiMetrics(profiles, feedbacks) {
    const totalSubmissions = profiles.length;
    if (totalSubmissions === 0) {
        return {
            totalSubmissions: 0,
            averageOverallRating: 0,
            avgAcademicRating: 0,
            crCompositeScore: 0,
            acrCompositeScore: 0,
            crCommunicationAvg: 0,
            crMaterialsAvg: 0,
            crAvailabilityAvg: 0,
            crWelfareAvg: 0,
            acrCommunicationAvg: 0,
            acrMaterialsAvg: 0,
            acrAvailabilityAvg: 0,
            acrWelfareAvg: 0,
            topTechTracks: [],
            topTechTrack: { name: 'N/A', count: 0 },
            topCommittees: [],
            topCommittee: { name: 'N/A', count: 0 },
            ratingDistribution: [1, 2, 3, 4, 5].map(r => ({ rating: r, count: 0 })),
            totalFundsPledged: 0,
            totalFundsCollected: 0,
            supportersCount: 0,
            volunteersCount: 0,
        };
    }
    // 100L Academic retrospective average
    const totalAcademicRating = profiles.reduce((sum, p) => sum + (Number(p.academicRating100L) || 0), 0);
    const averageOverallRating = Number((totalAcademicRating / totalSubmissions).toFixed(2));
    const avgAcademicRating = averageOverallRating;

    // Leadership scores computation
    let crCommSum = 0, crMatSum = 0, crAvailSum = 0, crWelfSum = 0;
    let acrCommSum = 0, acrMatSum = 0, acrAvailSum = 0, acrWelfSum = 0;
    const feedbackCount = feedbacks.length;
    if (feedbackCount > 0) {
        feedbacks.forEach(f => {
            crCommSum += Number(f.crCommunication) || 0;
            crMatSum += Number(f.crMaterials) || 0;
            crAvailSum += Number(f.crAvailability) || 0;
            crWelfSum += Number(f.crWelfare) || 0;

            acrCommSum += Number(f.acrCommunication) || 0;
            acrMatSum += Number(f.acrMaterials) || 0;
            acrAvailSum += Number(f.acrAvailability) || 0;
            acrWelfSum += Number(f.acrWelfare) || 0;
        });
    }

    const crCommunicationAvg = feedbackCount > 0 ? Number((crCommSum / feedbackCount).toFixed(2)) : 0;
    const crMaterialsAvg = feedbackCount > 0 ? Number((crMatSum / feedbackCount).toFixed(2)) : 0;
    const crAvailabilityAvg = feedbackCount > 0 ? Number((crAvailSum / feedbackCount).toFixed(2)) : 0;
    const crWelfareAvg = feedbackCount > 0 ? Number((crWelfSum / feedbackCount).toFixed(2)) : 0;
    const crCompositeScore = feedbackCount > 0 
        ? Number(((crCommunicationAvg + crMaterialsAvg + crAvailabilityAvg + crWelfareAvg) / 4).toFixed(2)) 
        : 0;

    const acrCommunicationAvg = feedbackCount > 0 ? Number((acrCommSum / feedbackCount).toFixed(2)) : 0;
    const acrMaterialsAvg = feedbackCount > 0 ? Number((acrMatSum / feedbackCount).toFixed(2)) : 0;
    const acrAvailabilityAvg = feedbackCount > 0 ? Number((acrAvailSum / feedbackCount).toFixed(2)) : 0;
    const acrWelfareAvg = feedbackCount > 0 ? Number((acrWelfSum / feedbackCount).toFixed(2)) : 0;
    const acrCompositeScore = feedbackCount > 0 
        ? Number(((acrCommunicationAvg + acrMaterialsAvg + acrAvailabilityAvg + acrWelfareAvg) / 4).toFixed(2)) 
        : 0;

    // Tech track distribution
    const trackMap = {};
    profiles.forEach(p => {
        if (p.techTrack) {
            trackMap[p.techTrack] = (trackMap[p.techTrack] || 0) + 1;
        }
    });
    const topTechTracks = Object.entries(trackMap)
        .map(([track, count]) => ({
            track,
            count,
            percentage: Number(((count / totalSubmissions) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);
    const topTechTrack = topTechTracks[0] 
        ? { name: topTechTracks[0].track, count: topTechTracks[0].count }
        : { name: 'N/A', count: 0 };

    // Committee / Volunteer sign-up demand
    const committeeMap = {};
    profiles.forEach(p => {
        const list = p.volunteerRoles || p.committees || [];
        list.forEach(c => {
            committeeMap[c] = (committeeMap[c] || 0) + 1;
        });
    });
    const topCommittees = Object.entries(committeeMap)
        .map(([committee, count]) => ({
            committee,
            count,
            percentage: Number(((count / totalSubmissions) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count);
    const topCommittee = topCommittees[0]
        ? { name: topCommittees[0].committee, count: topCommittees[0].count }
        : { name: 'N/A', count: 0 };

    // Voluntary Leadership Support & Contributions
    let totalFundsPledged = 0;
    let totalFundsCollected = 0;
    let supportersCount = 0;
    let volunteersCount = 0;

    profiles.forEach(p => {
        const amt = Number(p.supportAmount) || 0;
        if (amt > 0 || p.supportChoice === 'yes' || p.supportChoice === 'support_yes') {
            supportersCount++;
            totalFundsPledged += amt;
            if (p.paymentStatus === 'completed') {
                totalFundsCollected += amt;
            }
        }
        const roles = p.volunteerRoles || p.committees || [];
        if (roles.length > 0) {
            volunteersCount++;
        }
    });

    // Rating distribution (1-5 stars)
    const distCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    profiles.forEach(p => {
        const r = Math.round(Number(p.academicRating100L) || 0);
        if (r >= 1 && r <= 5)
            distCounts[r]++;
    });
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: distCounts[rating] || 0,
    }));

    return {
        totalSubmissions,
        averageOverallRating,
        avgAcademicRating,
        crCompositeScore,
        acrCompositeScore,
        crCommunicationAvg,
        crMaterialsAvg,
        crAvailabilityAvg,
        crWelfareAvg,
        acrCommunicationAvg,
        acrMaterialsAvg,
        acrAvailabilityAvg,
        acrWelfareAvg,
        topTechTracks,
        topTechTrack,
        topCommittees,
        topCommittee,
        ratingDistribution,
        totalFundsPledged,
        totalFundsCollected,
        supportersCount,
        volunteersCount,
    };
}
// ---------------------------------------------------------------------------
// 4. Committee Grouping Engine
// ---------------------------------------------------------------------------
export function groupCommitteeRosters(profiles) {
    return CLASS_COMMITTEES.map(c => {
        const members = profiles
            .filter(p => p.committees?.includes(c.id))
            .map(p => ({
            fullName: p.fullName,
            matricNo: p.matricNo,
            phone: p.phone,
            techTrack: p.techTrack,
        }));
        return {
            committeeId: c.id,
            committeeName: c.name,
            members,
        };
    });
}
