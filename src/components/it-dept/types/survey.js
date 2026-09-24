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
  volunteerRoles: [],
  customVolunteerRole: '',
  supportLeadershipChoice: 'no', // 'no' | 'yes'
  supportAmount: 0,
  paymentMethod: 'flutterwave', // 'flutterwave' | 'pledge'
  paymentStatus: 'unpaid', // 'unpaid' | 'pledged' | 'paid'
  paymentRef: '',
  supportNote: '',
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

export const VOLUNTEER_ROLES = [
  {
    id: 'graphic-designer',
    name: 'Graphic Designer',
    desc: 'Department flyers, social media banners, event posters, and visual branding',
    icon: 'Palette',
  },
  {
    id: 'video-editor',
    name: 'Video Editor & Motion Designer',
    desc: 'Class reels, event recaps, announcements, and tech teaser clips',
    icon: 'Film',
  },
  {
    id: 'social-media-manager',
    name: 'Social Media & Community Manager',
    desc: 'Managing department Twitter/X, Instagram, LinkedIn, and group engagement',
    icon: 'Share2',
  },
  {
    id: 'academic-tutor',
    name: 'Academic Tutor & Tutorial Coordinator',
    desc: 'Leading peer tutorials, organizing past questions, and study circles',
    icon: 'BookOpen',
  },
  {
    id: 'software-web-developer',
    name: 'Software & Web Developer',
    desc: 'Building department web portals, automation tools, and hackathon software',
    icon: 'Laptop',
  },
  {
    id: 'welfare-advocate',
    name: 'Welfare & Student Wellbeing Lead',
    desc: 'Student welfare, birthday recognitions, check-ins, and peer encouragement',
    icon: 'HeartHandshake',
  },
  {
    id: 'events-socials',
    name: 'Events, Socials & Sports Coordinator',
    desc: 'Planning game days, departmental sports, hangouts, and set gatherings',
    icon: 'Trophy',
  },
  {
    id: 'photographer',
    name: 'Photographer & Media Documenter',
    desc: 'Photographing lectures, practical sessions, events, and set milestones',
    icon: 'Camera',
  },
];

export const CLASS_COMMITTEES = [
  { id: 'academic', name: 'Academic & Tutorials Committee', icon: 'BookOpen', desc: 'Peer tutorial classes and past exam question banks' },
  { id: 'tech-projects', name: 'Tech & Projects Team', icon: 'Laptop', desc: 'Department portal and open-source class software' },
  { id: 'welfare-support', name: 'Welfare & Support Committee', icon: 'HeartHandshake', desc: 'Class wellbeing, birthdays, and peer assistance' },
  { id: 'media-publicity', name: 'Media, Publicity & Design Team', icon: 'Palette', desc: 'Event posters, social media, and branding' },
  { id: 'sports-socials', name: 'Sports & Socials Committee', icon: 'Trophy', desc: 'Football matches, game nights, and class hangouts' },
];

export const COMMITTEES = CLASS_COMMITTEES;
