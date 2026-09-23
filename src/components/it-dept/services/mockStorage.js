import { MONTH_NAMES } from '@/components/it-dept/types/survey';
export const STORAGE_KEY_STUDENTS = 'it_dept_students_v1';
export const STORAGE_KEY_FEEDBACK = 'it_dept_feedback_v1';
// ----------------------------------------------------------------------------
// 15 Realistic Pre-Seeded Student Directory Records
// ----------------------------------------------------------------------------
export const SEED_STUDENTS = [
    {
        id: 'student-001',
        fullName: 'Oluwaseun Adeleke',
        matricNo: '2024/1/10481IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348031234561',
        birthdayString: '14 October',
        birthDay: 14,
        birthMonth: 10,
        techTrack: 'AI, Machine Learning & Data',
        academicRating100L: 5,
        favoriteCourses: ['IFT 101', 'CSC 101', 'MTH 101'],
        toughestCourses: ['PHY 102', 'MTH 102'],
        challenges100L: ['Lecture materials access', 'Practical lab equipment'],
        committees: ['tech-projects', 'academic'],
        suggestions200L: 'Organize specialized AI & Python peer study workshops before exams.',
        createdAt: '2026-08-15T09:30:00.000Z',
    },
    {
        id: 'student-002',
        fullName: 'Chioma Okonkwo',
        matricNo: '2024/1/10482IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348023456782',
        birthdayString: '3 November',
        birthDay: 3,
        birthMonth: 11,
        techTrack: 'Frontend Engineering',
        academicRating100L: 4,
        favoriteCourses: ['CSC 101', 'GST 101'],
        toughestCourses: ['PHY 101', 'MTH 101'],
        challenges100L: ['Test schedule collisions', 'Late assignment notifications'],
        committees: ['media-publicity', 'tech-projects'],
        suggestions200L: 'Set up an official class GitHub repository and department UI design system.',
        createdAt: '2026-08-16T11:15:00.000Z',
    },
    {
        id: 'student-003',
        fullName: 'Ibrahim Musa',
        matricNo: '2024/1/10483IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348056789013',
        birthdayString: '22 January',
        birthDay: 22,
        birthMonth: 1,
        techTrack: 'Cybersecurity & InfoSec',
        academicRating100L: 4,
        favoriteCourses: ['IFT 101', 'PHY 101'],
        toughestCourses: ['CHM 101', 'MTH 102'],
        challenges100L: ['Course material sharing speed', 'Lab practicals scheduling'],
        committees: ['tech-projects', 'sports-socials'],
        suggestions200L: 'Host monthly Capture-the-Flag (CTF) challenges and Linux fundamentals sessions.',
        createdAt: '2026-08-17T14:45:00.000Z',
    },
    {
        id: 'student-004',
        fullName: 'Tunde Bakare',
        matricNo: '2024/1/10484IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348101122334',
        birthdayString: '15 March',
        birthDay: 15,
        birthMonth: 3,
        techTrack: 'Backend & Systems',
        academicRating100L: 5,
        favoriteCourses: ['CSC 101', 'MTH 101', 'IFT 101'],
        toughestCourses: ['PHY 102'],
        challenges100L: ['Group assignment freeloaders', 'Large lecture hall audio clarity'],
        committees: ['academic'],
        suggestions200L: 'Implement peer code reviews and backend API hackathons during the mid-semester break.',
        createdAt: '2026-08-18T08:20:00.000Z',
    },
    {
        id: 'student-005',
        fullName: 'Blessing Nwosu',
        matricNo: '2024/1/10485IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348134455665',
        birthdayString: '9 February',
        birthDay: 9,
        birthMonth: 2,
        techTrack: 'UI/UX & Product Design',
        academicRating100L: 4,
        favoriteCourses: ['GST 101', 'IFT 101'],
        toughestCourses: ['PHY 101', 'PHY 102'],
        challenges100L: ['Lecture venue changes', 'Course outline delays'],
        committees: ['media-publicity', 'welfare-support'],
        suggestions200L: 'Create clean, branded slide summaries for each course module.',
        createdAt: '2026-08-19T13:00:00.000Z',
    },
    {
        id: 'student-006',
        fullName: 'David Emmanuel',
        matricNo: '2024/1/10486IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348167788996',
        birthdayString: '28 June',
        birthDay: 28,
        birthMonth: 6,
        techTrack: 'Cloud Computing & DevOps',
        academicRating100L: 5,
        favoriteCourses: ['CSC 101', 'IFT 101', 'MTH 101'],
        toughestCourses: ['CHM 102'],
        challenges100L: ['Power supply in departmental labs', 'Internet connectivity during tests'],
        committees: ['tech-projects'],
        suggestions200L: 'Deploy class cloud architecture and CI/CD pipelines for department projects.',
        createdAt: '2026-08-20T16:10:00.000Z',
    },
    {
        id: 'student-007',
        fullName: 'Fatima Bello',
        matricNo: '2024/1/10487IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348089900117',
        birthdayString: '18 April',
        birthDay: 18,
        birthMonth: 4,
        techTrack: 'AI, Machine Learning & Data',
        academicRating100L: 4,
        favoriteCourses: ['MTH 101', 'CSC 101'],
        toughestCourses: ['PHY 102', 'GST 102'],
        challenges100L: ['Past question availability', 'Tutorial timing collisions'],
        committees: ['academic', 'welfare-support'],
        suggestions200L: 'Centralize past question archives with verified solutions on a class portal.',
        createdAt: '2026-08-21T10:05:00.000Z',
    },
    {
        id: 'student-008',
        fullName: 'Chinedu Eze',
        matricNo: '2024/1/10488IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348021123458',
        birthdayString: '5 December',
        birthDay: 5,
        birthMonth: 12,
        techTrack: 'Mobile Development',
        academicRating100L: 3,
        favoriteCourses: ['CSC 101', 'IFT 101'],
        toughestCourses: ['PHY 101', 'PHY 102', 'MTH 102'],
        challenges100L: ['Fast-paced lecture delivery', 'Exam timetable congestion'],
        committees: ['sports-socials'],
        suggestions200L: 'Organize inter-department friendly sports matches to de-stress during exams.',
        createdAt: '2026-08-22T12:40:00.000Z',
    },
    {
        id: 'student-009',
        fullName: 'Amina Abubakar',
        matricNo: '2024/1/10489IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348093344559',
        birthdayString: '12 August',
        birthDay: 12,
        birthMonth: 8,
        techTrack: 'Frontend Engineering',
        academicRating100L: 4,
        favoriteCourses: ['IFT 101', 'GST 101'],
        toughestCourses: ['MTH 101', 'PHY 102'],
        challenges100L: ['Late afternoon class fatigue', 'Group work coordination'],
        committees: ['welfare-support'],
        suggestions200L: 'Implement a buddy support system so no student falls behind in difficult courses.',
        createdAt: '2026-08-23T15:25:00.000Z',
    },
    {
        id: 'student-010',
        fullName: 'Victor Oladipo',
        matricNo: '2024/1/10490IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348145566770',
        birthdayString: '24 July',
        birthDay: 24,
        birthMonth: 7,
        techTrack: 'Backend & Systems',
        academicRating100L: 5,
        favoriteCourses: ['CSC 101', 'MTH 102', 'IFT 101'],
        toughestCourses: ['CHM 101'],
        challenges100L: ['Lack of practical coding assignments in 100L'],
        committees: ['tech-projects', 'academic'],
        suggestions200L: 'Shift from purely theoretical classes to weekly practical lab build sessions.',
        createdAt: '2026-08-24T09:50:00.000Z',
    },
    {
        id: 'student-011',
        fullName: 'Grace Bassey',
        matricNo: '2024/1/10491IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348178899001',
        birthdayString: '19 September',
        birthDay: 19,
        birthMonth: 9,
        techTrack: 'UI/UX & Product Design',
        academicRating100L: 4,
        favoriteCourses: ['GST 101', 'IFT 101'],
        toughestCourses: ['PHY 101', 'MTH 101'],
        challenges100L: ['Textbook and syllabus accessibility', 'Conflicting test dates'],
        committees: ['media-publicity', 'welfare-support'],
        suggestions200L: 'Create monthly digital newsletters celebrating student achievements and project showcases.',
        createdAt: '2026-08-25T11:35:00.000Z',
    },
    {
        id: 'student-012',
        fullName: 'Samuel Kalu',
        matricNo: '2024/1/10492IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348062233442',
        birthdayString: '30 May',
        birthDay: 30,
        birthMonth: 5,
        techTrack: 'Still Exploring / Generalist',
        academicRating100L: 4,
        favoriteCourses: ['CSC 101', 'GST 102'],
        toughestCourses: ['PHY 102', 'CHM 102'],
        challenges100L: ['Finding personal tech niche', 'Time management between study and practice'],
        committees: ['academic'],
        suggestions200L: 'Host career orientation panels with 300L and 400L seniors sharing industry insights.',
        createdAt: '2026-08-26T14:15:00.000Z',
    },
    {
        id: 'student-013',
        fullName: 'Zainab Usman',
        matricNo: '2024/1/10493IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348123344553',
        birthdayString: '4 March',
        birthDay: 4,
        birthMonth: 3,
        techTrack: 'AI, Machine Learning & Data',
        academicRating100L: 5,
        favoriteCourses: ['MTH 101', 'MTH 102', 'IFT 101'],
        toughestCourses: ['PHY 101'],
        challenges100L: ['Late release of test scores'],
        committees: ['tech-projects'],
        suggestions200L: 'Organize data science competitions using real African datasets.',
        createdAt: '2026-08-27T08:40:00.000Z',
    },
    {
        id: 'student-014',
        fullName: 'Emeka Obi',
        matricNo: '2024/1/10494IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348074455664',
        birthdayString: '31 August',
        birthDay: 31,
        birthMonth: 8,
        techTrack: 'Cybersecurity & InfoSec',
        academicRating100L: 3,
        favoriteCourses: ['IFT 101', 'CSC 101'],
        toughestCourses: ['PHY 102', 'MTH 101'],
        challenges100L: ['Balancing difficult math courses with self-taught programming'],
        committees: ['sports-socials'],
        suggestions200L: 'Schedule tutorial sessions on weekend mornings rather than late evenings.',
        createdAt: '2026-08-28T16:00:00.000Z',
    },
    {
        id: 'student-015',
        fullName: 'Precious Ayomide',
        matricNo: '2024/1/10495IT',
        email: 'student@unilorin.edu.ng',
        phone: '+2348186677885',
        birthdayString: '7 January',
        birthDay: 7,
        birthMonth: 1,
        techTrack: 'Cloud Computing & DevOps',
        academicRating100L: 5,
        favoriteCourses: ['CSC 101', 'IFT 101'],
        toughestCourses: ['CHM 101', 'PHY 102'],
        challenges100L: ['Information spread across too many unofficial WhatsApp groups'],
        committees: ['academic', 'welfare-support'],
        suggestions200L: 'Streamline all class announcements through a single verified WhatsApp announcement channel.',
        createdAt: '2026-08-29T10:20:00.000Z',
    },
];
// Helper to compute overall score average across 8 metrics
const calcOverall = (c1, c2, c3, c4, a1, a2, a3, a4) => {
    const sum = c1 + c2 + c3 + c4 + a1 + a2 + a3 + a4;
    return Math.round((sum / 8) * 100) / 100;
};
// ----------------------------------------------------------------------------
// 15 Pre-Seeded Leadership Feedback Entries (8 Anonymous, 7 Attributed)
// ----------------------------------------------------------------------------
export const SEED_FEEDBACK = [
    // 1. Attributed: Oluwaseun Adeleke
    {
        id: 'feedback-001',
        studentId: 'student-001',
        studentName: 'Oluwaseun Adeleke',
        studentMatric: '2024/1/10481IT',
        isAnonymous: false,
        crCommunication: 5,
        crMaterials: 5,
        crAvailability: 4,
        crWelfare: 5,
        acrCommunication: 5,
        acrMaterials: 4,
        acrAvailability: 5,
        acrWelfare: 5,
        overallScore: calcOverall(5, 5, 4, 5, 5, 4, 5, 5),
        wellDone: 'Exceptional communication during exam timetable clash resolution with the department office.',
        criticalAreas: 'Advocate for early release of continuous assessment test scripts so students know where they stand.',
        createdAt: '2026-08-15T09:35:00.000Z',
    },
    // 2. Anonymous #1
    {
        id: 'feedback-002',
        studentId: null,
        isAnonymous: true,
        crCommunication: 4,
        crMaterials: 3,
        crAvailability: 4,
        crWelfare: 3,
        acrCommunication: 4,
        acrMaterials: 3,
        acrAvailability: 4,
        acrWelfare: 4,
        overallScore: calcOverall(4, 3, 4, 3, 4, 3, 4, 4),
        wellDone: 'The CR is very approachable and stays calm during stressful lecture venue shifts.',
        criticalAreas: 'PDF slides for PHY 102 were shared very late. Please establish a shared Google Drive or Telegram archive.',
        createdAt: '2026-08-16T11:20:00.000Z',
    },
    // 3. Attributed: Chioma Okonkwo
    {
        id: 'feedback-003',
        studentId: 'student-002',
        studentName: 'Chioma Okonkwo',
        studentMatric: '2024/1/10482IT',
        isAnonymous: false,
        crCommunication: 4,
        crMaterials: 5,
        crAvailability: 5,
        crWelfare: 4,
        acrCommunication: 5,
        acrMaterials: 4,
        acrAvailability: 4,
        acrWelfare: 5,
        overallScore: calcOverall(4, 5, 5, 4, 5, 4, 4, 5),
        wellDone: 'The ACR is incredible with reminders and welfare check-ins when people are sick.',
        criticalAreas: 'Set up clear quiet hours on the general class WhatsApp group to prevent spam at night.',
        createdAt: '2026-08-17T14:50:00.000Z',
    },
    // 4. Anonymous #2
    {
        id: 'feedback-004',
        studentId: null,
        isAnonymous: true,
        crCommunication: 3,
        crMaterials: 4,
        crAvailability: 3,
        crWelfare: 3,
        acrCommunication: 4,
        acrMaterials: 4,
        acrAvailability: 4,
        acrWelfare: 3,
        overallScore: calcOverall(3, 4, 3, 3, 4, 4, 4, 3),
        wellDone: 'Lecturer contact information was always kept safe and professional boundaries were respected.',
        criticalAreas: 'Sometimes announcements are buried under casual chats. We need an announcement-only channel.',
        createdAt: '2026-08-18T08:25:00.000Z',
    },
    // 5. Attributed: Ibrahim Musa
    {
        id: 'feedback-005',
        studentId: 'student-003',
        studentName: 'Ibrahim Musa',
        studentMatric: '2024/1/10483IT',
        isAnonymous: false,
        crCommunication: 5,
        crMaterials: 4,
        crAvailability: 4,
        crWelfare: 4,
        acrCommunication: 4,
        acrMaterials: 5,
        acrAvailability: 4,
        acrWelfare: 4,
        overallScore: calcOverall(5, 4, 4, 4, 4, 5, 4, 4),
        wellDone: 'Both CR and ACR represented our class honorably before the Faculty Dean and HOD.',
        criticalAreas: 'Start 200L peer tutorials early in the semester, not two weeks before exams.',
        createdAt: '2026-08-19T13:05:00.000Z',
    },
    // 6. Anonymous #3
    {
        id: 'feedback-006',
        studentId: null,
        isAnonymous: true,
        crCommunication: 4,
        crMaterials: 4,
        crAvailability: 4,
        crWelfare: 4,
        acrCommunication: 3,
        acrMaterials: 4,
        acrAvailability: 3,
        acrWelfare: 3,
        overallScore: calcOverall(4, 4, 4, 4, 3, 4, 3, 3),
        wellDone: 'Promptly secured extra chairs and fans in the LT when the hall was overcrowded.',
        criticalAreas: 'The ACR should be more visible during morning lectures when the CR is unavailable.',
        createdAt: '2026-08-20T16:15:00.000Z',
    },
    // 7. Attributed: Tunde Bakare
    {
        id: 'feedback-007',
        studentId: 'student-004',
        studentName: 'Tunde Bakare',
        studentMatric: '2024/1/10484IT',
        isAnonymous: false,
        crCommunication: 5,
        crMaterials: 5,
        crAvailability: 5,
        crWelfare: 5,
        acrCommunication: 5,
        acrMaterials: 5,
        acrAvailability: 5,
        acrWelfare: 4,
        overallScore: calcOverall(5, 5, 5, 5, 5, 5, 5, 4),
        wellDone: 'Superb coordination of the CSC 101 practical groups. Everyone had access to a working terminal.',
        criticalAreas: 'Work with departmental lab attendants to ensure the air conditioning works in 200L.',
        createdAt: '2026-08-21T10:10:00.000Z',
    },
    // 8. Anonymous #4
    {
        id: 'feedback-008',
        studentId: null,
        isAnonymous: true,
        crCommunication: 4,
        crMaterials: 4,
        crAvailability: 3,
        crWelfare: 4,
        acrCommunication: 4,
        acrMaterials: 4,
        acrAvailability: 4,
        acrWelfare: 4,
        overallScore: calcOverall(4, 4, 3, 4, 4, 4, 4, 4),
        wellDone: 'Good conflict mediation between students during high-tension group presentations.',
        criticalAreas: 'Clarify course rep election or reappointment processes transparently for 200 level.',
        createdAt: '2026-08-22T12:45:00.000Z',
    },
    // 9. Attributed: Blessing Nwosu
    {
        id: 'feedback-009',
        studentId: 'student-005',
        studentName: 'Blessing Nwosu',
        studentMatric: '2024/1/10485IT',
        isAnonymous: false,
        crCommunication: 5,
        crMaterials: 4,
        crAvailability: 5,
        crWelfare: 5,
        acrCommunication: 5,
        acrMaterials: 5,
        acrAvailability: 5,
        acrWelfare: 5,
        overallScore: calcOverall(5, 4, 5, 5, 5, 5, 5, 5),
        wellDone: 'Remembering classmates on their birthdays made the whole class feel like a unified family.',
        criticalAreas: 'Encourage shy students to speak up during Q&A and tutorial sessions.',
        createdAt: '2026-08-23T15:30:00.000Z',
    },
    // 10. Anonymous #5
    {
        id: 'feedback-010',
        studentId: null,
        isAnonymous: true,
        crCommunication: 3,
        crMaterials: 3,
        crAvailability: 3,
        crWelfare: 3,
        acrCommunication: 4,
        acrMaterials: 4,
        acrAvailability: 3,
        acrWelfare: 3,
        overallScore: calcOverall(3, 3, 3, 3, 4, 4, 3, 3),
        wellDone: 'They try their best under very demanding conditions from difficult lecturers.',
        criticalAreas: 'Be firmer with lecturers who schedule impromptu 7 AM tests on Saturdays without prior notice.',
        createdAt: '2026-08-24T09:55:00.000Z',
    },
    // 11. Attributed: David Emmanuel
    {
        id: 'feedback-011',
        studentId: 'student-006',
        studentName: 'David Emmanuel',
        studentMatric: '2024/1/10486IT',
        isAnonymous: false,
        crCommunication: 4,
        crMaterials: 5,
        crAvailability: 4,
        crWelfare: 4,
        acrCommunication: 5,
        acrMaterials: 4,
        acrAvailability: 4,
        acrWelfare: 4,
        overallScore: calcOverall(4, 5, 4, 4, 5, 4, 4, 4),
        wellDone: 'Sharing recorded audio summaries of key math derivations helped commuting students tremendously.',
        criticalAreas: 'Collaborate with the Tech & Projects team to automate class attendance tracking.',
        createdAt: '2026-08-25T11:40:00.000Z',
    },
    // 12. Anonymous #6
    {
        id: 'feedback-012',
        studentId: null,
        isAnonymous: true,
        crCommunication: 5,
        crMaterials: 4,
        crAvailability: 4,
        crWelfare: 4,
        acrCommunication: 4,
        acrMaterials: 4,
        acrAvailability: 5,
        acrWelfare: 4,
        overallScore: calcOverall(5, 4, 4, 4, 4, 4, 5, 4),
        wellDone: 'Both reps are very respectful and never misuse their position or show favoritism.',
        criticalAreas: 'Ensure past questions are typed out cleanly rather than blurry smartphone camera photos.',
        createdAt: '2026-08-26T14:20:00.000Z',
    },
    // 13. Attributed: Fatima Bello
    {
        id: 'feedback-013',
        studentId: 'student-007',
        studentName: 'Fatima Bello',
        studentMatric: '2024/1/10487IT',
        isAnonymous: false,
        crCommunication: 5,
        crMaterials: 5,
        crAvailability: 5,
        crWelfare: 5,
        acrCommunication: 5,
        acrMaterials: 5,
        acrAvailability: 4,
        acrWelfare: 5,
        overallScore: calcOverall(5, 5, 5, 5, 5, 5, 4, 5),
        wellDone: 'The class leadership showed immense empathy during the mid-semester health outbreak, organizing notes for absent students.',
        criticalAreas: 'Introduce monthly anonymous surveys like this one so issues are caught early in 200L.',
        createdAt: '2026-08-27T08:45:00.000Z',
    },
    // 14. Anonymous #7
    {
        id: 'feedback-014',
        studentId: null,
        isAnonymous: true,
        crCommunication: 4,
        crMaterials: 4,
        crAvailability: 4,
        crWelfare: 3,
        acrCommunication: 4,
        acrMaterials: 3,
        acrAvailability: 4,
        acrWelfare: 4,
        overallScore: calcOverall(4, 4, 4, 3, 4, 3, 4, 4),
        wellDone: 'Quick updates whenever a lecturer cancels or postpones a class saved us long transit trips.',
        criticalAreas: 'Create a dedicated committee for sports and socials to balance our heavy IT curriculum.',
        createdAt: '2026-08-28T16:05:00.000Z',
    },
    // 15. Anonymous #8
    {
        id: 'feedback-015',
        studentId: null,
        isAnonymous: true,
        crCommunication: 5,
        crMaterials: 5,
        crAvailability: 4,
        crWelfare: 5,
        acrCommunication: 5,
        acrMaterials: 5,
        acrAvailability: 5,
        acrWelfare: 5,
        overallScore: calcOverall(5, 5, 4, 5, 5, 5, 5, 5),
        wellDone: 'Overall sterling performance! You two navigated a chaotic 100L transition with poise and dedication.',
        criticalAreas: 'Maintain this high standard and do not let 200L technical workload burn out your leadership team.',
        createdAt: '2026-08-29T10:25:00.000Z',
    },
];
// ----------------------------------------------------------------------------
// LocalStorage Persistence Helpers
// ----------------------------------------------------------------------------
function isBrowser() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
function getStoredJson(key, fallback) {
    if (!isBrowser())
        return fallback;
    try {
        const item = window.localStorage.getItem(key);
        if (!item)
            return fallback;
        return JSON.parse(item);
    }
    catch (err) {
        console.warn(`Error reading localStorage key "${key}":`, err);
        return fallback;
    }
}
function setStoredJson(key, value) {
    if (!isBrowser())
        return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
    catch (err) {
        console.warn(`Error writing localStorage key "${key}":`, err);
    }
}
/**
 * Initializes mock storage with 15 pre-seeded records if empty.
 */
export function initializeMockStorage() {
    if (!isBrowser())
        return;
    const existingStudents = window.localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (!existingStudents || existingStudents === '[]') {
        setStoredJson(STORAGE_KEY_STUDENTS, SEED_STUDENTS);
    }
    const existingFeedback = window.localStorage.getItem(STORAGE_KEY_FEEDBACK);
    if (!existingFeedback || existingFeedback === '[]') {
        setStoredJson(STORAGE_KEY_FEEDBACK, SEED_FEEDBACK);
    }
}
// Automatically ensure mock storage is populated on module load
initializeMockStorage();
/**
 * Normalizes matriculation numbers for clean comparisons.
 */
export function normalizeMatric(matric) {
    return matric.trim().toUpperCase().replace(/\s+/g, '');
}
/**
 * Fetches all student profiles from mock storage.
 */
export function getMockStudents() {
    const students = getStoredJson(STORAGE_KEY_STUDENTS, SEED_STUDENTS);
    return students && students.length > 0 ? students : [...SEED_STUDENTS];
}
/**
 * Checks if a matriculation number already exists in mock storage.
 */
export function checkMockMatricExists(matricNo) {
    const normalized = normalizeMatric(matricNo);
    if (!normalized)
        return false;
    const students = getMockStudents();
    return students.some(s => normalizeMatric(s.matricNo) === normalized);
}
/**
 * Saves a new student profile to mock storage.
 */
export function saveMockStudent(profileInput) {
    const students = getMockStudents();
    const normalizedMatric = normalizeMatric(profileInput.matricNo);
    const newProfile = {
        ...profileInput,
        id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        matricNo: normalizedMatric,
        birthdayString: profileInput.birthdayString || `${profileInput.birthDay} ${MONTH_NAMES[profileInput.birthMonth - 1] || ''}`,
        createdAt: new Date().toISOString(),
    };
    const updated = [newProfile, ...students];
    setStoredJson(STORAGE_KEY_STUDENTS, updated);
    return newProfile;
}
/**
 * Fetches all leadership feedback records from mock storage.
 */
export function getMockFeedback() {
    const feedback = getStoredJson(STORAGE_KEY_FEEDBACK, SEED_FEEDBACK);
    return feedback && feedback.length > 0 ? feedback : [...SEED_FEEDBACK];
}
/**
 * Saves a new leadership feedback record to mock storage.
 */
export function saveMockFeedback(feedbackInput) {
    const existingFeedback = getMockFeedback();
    const overallScore = calcOverall(feedbackInput.crCommunication, feedbackInput.crMaterials, feedbackInput.crAvailability, feedbackInput.crWelfare, feedbackInput.acrCommunication, feedbackInput.acrMaterials, feedbackInput.acrAvailability, feedbackInput.acrWelfare);
    const newFeedback = {
        ...feedbackInput,
        id: `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        overallScore,
        createdAt: new Date().toISOString(),
    };
    // Enforce anonymity integrity: studentId and names MUST be omitted if anonymous
    if (newFeedback.isAnonymous) {
        newFeedback.studentId = null;
        delete newFeedback.studentName;
        delete newFeedback.studentMatric;
    }
    const updated = [newFeedback, ...existingFeedback];
    setStoredJson(STORAGE_KEY_FEEDBACK, updated);
    return newFeedback;
}
/**
 * Resets mock storage back to the original 15 seed records.
 */
export function resetMockData() {
    setStoredJson(STORAGE_KEY_STUDENTS, SEED_STUDENTS);
    setStoredJson(STORAGE_KEY_FEEDBACK, SEED_FEEDBACK);
}
