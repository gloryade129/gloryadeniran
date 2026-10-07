import { NextResponse } from 'next/server';
import { 
  getProjectEngagement, 
  recordProjectLike, 
  addProjectComment, 
  getAllComments,
  recordProjectView,
  getProjectViews,
  getAllProjectsMetrics,
  resetSubscribersAndLikes,
} from '@/lib/newsletter-db';
import { sendEmail } from '@/lib/brevo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const all = searchParams.get('all');
    const summary = searchParams.get('summary');
    const projectIdsParam = searchParams.get('projectIds');

    // Summary of metrics across all/multiple projects
    if (summary === 'true') {
      const ids = projectIdsParam ? projectIdsParam.split(',') : [];
      const metrics = await getAllProjectsMetrics(ids);
      return NextResponse.json({ success: true, metrics });
    }

    if (all === 'true') {
      const comments = await getAllComments();
      return NextResponse.json({ success: true, comments });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const [engagement, views] = await Promise.all([
      getProjectEngagement(projectId),
      getProjectViews(projectId),
    ]);

    return NextResponse.json({ success: true, views, ...engagement });
  } catch (error) {
    console.error('Engagement GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, projectTitle, action, email, name, text, visitorId } = body;

    // Reset action for clean slate
    if (action === 'reset') {
      const result = await resetSubscribersAndLikes();
      return NextResponse.json(result);
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const cleanTitle = (projectTitle || projectId).trim();

    // ── 1. RECORD VIEW ──
    if (action === 'view') {
      const result = await recordProjectView(projectId, visitorId);
      return NextResponse.json({ success: true, ...result });
    }

    // ── 2. RECORD LIKE ──
    if (action === 'like') {
      const result = await recordProjectLike(projectId, email, name);

      // Send instant email notification to Glory
      try {
        const likerDisplay = name || email || 'A website visitor';
        await sendEmail({
          to: 'adeniranglory129@gmail.com',
          subject: `New Project Like on "${cleanTitle}"`,
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0E17; color: #F8FAFC; padding: 32px 24px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
              <div style="margin-bottom: 20px;">
                <span style="background: rgba(239,68,68,0.2); color: #F87171; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">New Project Reaction</span>
              </div>
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #FFFFFF;">${likerDisplay} liked your project!</h2>
              <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">Someone just showed love for your work:</p>
              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #FFFFFF;">Project: ${cleanTitle}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #94A3B8;">Project ID: <code style="color: #38BDF8;">${projectId}</code></p>
                ${email ? `<p style="margin: 0 0 8px; font-size: 13px; color: #CBD5E1;">Liker Email: <a href="mailto:${email}" style="color: #38BDF8; text-decoration: none;">${email}</a></p>` : ''}
                <p style="margin: 0; font-size: 13px; color: #34D399;"><strong>Total Likes:</strong> ${result.likes}</p>
              </div>
              <p style="color: #64748B; font-size: 12px; margin: 0;">Recorded live on your portfolio and Admin Dashboard.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('Like email notification warning:', mailErr.message);
      }

      return NextResponse.json({ success: true, ...result });
    }

    // ── 3. RECORD COMMENT ──
    if (action === 'comment') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
      }

      const comment = await addProjectComment({
        projectId,
        name,
        email,
        text,
      });

      // Send instant email notification to Glory
      try {
        const commenterDisplay = (name || '').trim() || (email ? email.split('@')[0] : 'Visitor');
        await sendEmail({
          to: 'adeniranglory129@gmail.com',
          subject: `New Comment on "${cleanTitle}" from ${commenterDisplay}`,
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0E17; color: #F8FAFC; padding: 32px 24px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
              <div style="margin-bottom: 20px;">
                <span style="background: rgba(37,99,235,0.2); color: #60A5FA; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">New Discussion Comment</span>
              </div>
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #FFFFFF;">${commenterDisplay} shared feedback on "${cleanTitle}"</h2>
              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px; font-size: 14px;"><strong>Author:</strong> ${name || 'Anonymous'}</p>
                ${email ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #38BDF8; text-decoration: none;">${email}</a></p>` : ''}
                <p style="margin: 0 0 12px; font-size: 13px; color: #94A3B8;"><strong>Project:</strong> ${cleanTitle} (<code>${projectId}</code>)</p>
                <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; font-size: 14px; line-height: 1.6; color: #F1F5F9; font-style: italic;">
                  "${text}"
                </div>
              </div>
              <p style="color: #64748B; font-size: 12px; margin: 0;">You can view and manage all comments in your Admin Dashboard.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('Comment email notification warning:', mailErr.message);
      }

      return NextResponse.json({ success: true, comment });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Engagement POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
