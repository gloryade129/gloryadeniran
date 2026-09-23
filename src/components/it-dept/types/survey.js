// Survey Form & DTO Type Contracts
export const INITIAL_SURVEY_STATE = {
    fullName: '',
    matricNo: '',
    email: '',
    phone: '',
    birthDay: 1,
    birthMonth: 1,
    techTrack: '',
    academicRating100L: 0,
    favoriteCourses: [],
    toughestCourses: [],
    challenges100L: [],
    crRatingCommunication: 0,
    crRatingMaterials: 0,
    crRatingAvailability: 0,
    crRatingWelfare: 0,
    acrRatingCommunication: 0,
    acrRatingMaterials: 0,
    acrRatingAvailability: 0,
    acrRatingWelfare: 0,
    leadershipWellDone: '',
    leadershipCriticalAreas: '',
    isAnonymousLeadership: false,
    committees: [],
    suggestions200L: '',
};
export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
export const TECH_TRACKS = [
    { id: 'frontend', name: 'Frontend Engineering', icon: 'Code', desc: 'React, Next.js, modern UI/UX architecture' },
    { id: 'backend', name: 'Backend & Systems', icon: 'Server', desc: 'Node.js, Python, Go, APIs, and scalable DBs' },
    { id: 'ai-data', name: 'AI, Machine Learning & Data', icon: 'Cpu', desc: 'Data Science, ML models, LLMs & Analytics' },
    { id: 'cybersecurity', name: 'Cybersecurity & InfoSec', icon: 'Shield', desc: 'Network security, ethical hacking, forensics' },
    { id: 'ui-ux', name: 'UI/UX & Product Design', icon: 'Layout', desc: 'Figma, prototyping, user-centric systems' },
    { id: 'cloud-devops', name: 'Cloud Computing & DevOps', icon: 'Cloud', desc: 'Docker, CI/CD, Kubernetes, AWS/GCP' },
    { id: 'mobile', name: 'Mobile Development', icon: 'Smartphone', desc: 'React Native, Flutter, Kotlin, iOS/Android' },
    { id: 'exploring', name: 'Still Exploring / Generalist', icon: 'Compass', desc: 'Discovering core strengths across computing' },
];
export const CLASS_COMMITTEES = [
    {
        id: 'academic',
        name: 'Academic & Tutorials Committee',
        icon: 'BookOpen',
        desc: 'Peer tutorial classes, past exam question banks, academic mentoring',
    },
    {
        id: 'tech-projects',
        name: 'Tech & Projects Team',
        icon: 'Laptop',
        desc: 'Department portal, hackathon projects, open-source class software',
    },
    {
        id: 'welfare-support',
        name: 'Welfare & Support Committee',
        icon: 'HeartHandshake',
        desc: 'Class wellbeing, birthday shouts & gifts, peer assistance',
    },
    {
        id: 'media-publicity',
        name: 'Media, Publicity & Design Team',
        icon: 'Palette',
        desc: 'Event posters, social media presence, announcements branding',
    },
    {
        id: 'sports-socials',
        name: 'Sports & Socials Committee',
        icon: 'Trophy',
        desc: 'Inter-level football matches, game nights, class hangouts',
    },
];

export const COMMITTEES = CLASS_COMMITTEES;
