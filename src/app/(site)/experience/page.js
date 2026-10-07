import { getExperience } from '@/lib/data';

export const metadata = {
  title: "Professional Experience | Glory Adeniran",
  description: "Explore the professional timeline, agency roles, and design accomplishments of Glory Adeniran working as Creative Lead at Global Graphics and product designer.",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Experience() {
  const experienceData = await getExperience();

  return (
    <div style={{ minHeight: '100vh', padding: '100px 1.5rem 120px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h1 className="animate-fade-in" style={{ fontSize: 'clamp(2.2rem, 7vw, 3rem)', marginBottom: '2rem' }}>Experience</h1>
      <div className="animate-fade-in" style={{ animationDelay: '0.2s', borderLeft: '2px solid var(--lime)', paddingLeft: '1.75rem', marginLeft: '0.5rem' }}>
        {experienceData.map((exp) => (
          <div key={exp.id} style={{ marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 'calc(-1.75rem - 8px)',
              top: '8px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'var(--lime)',
              boxShadow: '0 0 15px var(--lime)'
            }}></div>
            <h3 style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.5rem)', color: 'var(--white)' }}>{exp.role}</h3>
            <p style={{ color: 'var(--lime)', fontFamily: 'var(--mono)', fontSize: '0.88rem', marginTop: '4px' }}>
              {exp.company} | {exp.period}
            </p>
            <p style={{ marginTop: '0.75rem', color: 'var(--gray-1)', lineHeight: '1.6', fontSize: '14.5px' }}>
              {exp.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
