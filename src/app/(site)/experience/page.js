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
    <div style={{ paddingTop: '100px', minHeight: '100vh', padding: '100px 2rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="animate-fade-in" style={{ fontSize: '3rem', marginBottom: '2rem' }}>Experience</h1>
      <div className="animate-fade-in" style={{ animationDelay: '0.2s', borderLeft: '2px solid var(--lime)', paddingLeft: '2rem' }}>
        {experienceData.map((exp) => (
          <div key={exp.id} style={{ marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '-39px',
              top: '8px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: 'var(--lime)',
              boxShadow: '0 0 15px var(--lime)'
            }}></div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--white)' }}>{exp.role}</h3>
            <p style={{ color: 'var(--lime)', fontFamily: 'var(--mono)', fontSize: '0.9rem', marginTop: '4px' }}>
              {exp.company} | {exp.period}
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--gray-1)', lineHeight: '1.6' }}>
              {exp.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
