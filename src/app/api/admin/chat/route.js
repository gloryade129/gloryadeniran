import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { 
  getProjects, setProjects, 
  getSettings, setSettings, 
  getExperience, setExperience 
} from '@/lib/data';

// Helper to execute tools requested by Gemini
async function executeTool(name, args) {
  switch (name) {
    case 'get_projects': {
      const data = await getProjects();
      return data;
    }
    case 'add_project': {
      const data = await getProjects();
      const cat = args.category;
      if (!data[cat]) {
        data[cat] = [];
      }
      const newProj = {
        id: `p_${Date.now()}`,
        title: args.title,
        subcategory: args.subcategory || '',
        description: args.description || '',
        image: args.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
        link: args.link || '',
        images: [],
        links: args.link ? [{ label: 'Link', url: args.link }] : [],
        details: args.details || args.description || ''
      };
      data[cat].push(newProj);
      await setProjects(data);
      revalidatePath('/');
      revalidatePath('/work');
      revalidatePath('/work/[id]', 'page');
      return { success: true, project: newProj };
    }
    case 'update_project': {
      const data = await getProjects();
      const cat = args.category;
      const id = args.projectId;
      if (!data[cat]) {
        throw new Error(`Category ${cat} not found`);
      }
      const projIndex = data[cat].findIndex(p => p.id === id);
      if (projIndex === -1) {
        throw new Error(`Project ${id} not found in category ${cat}`);
      }
      
      const current = data[cat][projIndex];
      const updated = {
        ...current,
        title: args.title !== undefined ? args.title : current.title,
        subcategory: args.subcategory !== undefined ? args.subcategory : current.subcategory,
        description: args.description !== undefined ? args.description : current.description,
        image: args.image !== undefined ? args.image : current.image,
        link: args.link !== undefined ? args.link : current.link,
        details: args.details !== undefined ? args.details : current.details
      };
      
      data[cat][projIndex] = updated;
      await setProjects(data);
      revalidatePath('/');
      revalidatePath('/work');
      revalidatePath('/work/[id]', 'page');
      return { success: true, project: updated };
    }
    case 'delete_project': {
      const data = await getProjects();
      const cat = args.category;
      const id = args.projectId;
      if (!data[cat]) {
        throw new Error(`Category ${cat} not found`);
      }
      data[cat] = data[cat].filter(p => p.id !== id);
      await setProjects(data);
      revalidatePath('/');
      revalidatePath('/work');
      revalidatePath('/work/[id]', 'page');
      return { success: true };
    }
    case 'get_experience': {
      const data = await getExperience();
      return data;
    }
    case 'add_experience': {
      const data = await getExperience();
      const newEntry = {
        id: `e_${Date.now()}`,
        role: args.role,
        company: args.company,
        period: args.period,
        description: args.description || ''
      };
      data.push(newEntry);
      await setExperience(data);
      revalidatePath('/');
      return { success: true, entry: newEntry };
    }
    case 'update_experience': {
      const data = await getExperience();
      const id = args.entryId;
      const index = data.findIndex(e => e.id === id);
      if (index === -1) {
        throw new Error(`Experience entry ${id} not found`);
      }
      
      const current = data[index];
      const updated = {
        ...current,
        role: args.role !== undefined ? args.role : current.role,
        company: args.company !== undefined ? args.company : current.company,
        period: args.period !== undefined ? args.period : current.period,
        description: args.description !== undefined ? args.description : current.description
      };
      data[index] = updated;
      await setExperience(data);
      revalidatePath('/');
      return { success: true, entry: updated };
    }
    case 'delete_experience': {
      let data = await getExperience();
      const id = args.entryId;
      data = data.filter(e => e.id !== id);
      await setExperience(data);
      revalidatePath('/');
      return { success: true };
    }
    case 'get_profile_settings': {
      const data = await getSettings();
      return data;
    }
    case 'update_profile_settings': {
      const settings = await getSettings();
      if (args.name !== undefined) settings.profile.name = args.name;
      if (args.title !== undefined) settings.profile.title = args.title;
      if (args.bio !== undefined) settings.profile.bio = args.bio;
      if (args.email !== undefined) settings.profile.email = args.email;
      if (args.location !== undefined) settings.profile.location = args.location;
      if (args.instagram !== undefined) settings.profile.instagram = args.instagram;
      if (args.facebook !== undefined) settings.profile.facebook = args.facebook;
      if (args.availability !== undefined) settings.profile.availability = args.availability;
      if (args.musicEnabled !== undefined) settings.musicEnabled = args.musicEnabled;
      if (args.services !== undefined) settings.services = args.services;
      if (args.tools !== undefined) settings.tools = args.tools;
      if (args.customCSS !== undefined) settings.customCSS = args.customCSS;
      if (args.categories !== undefined) settings.categories = args.categories;
      
      await setSettings(settings);
      revalidatePath('/');
      return { success: true, settings };
    }
    default:
      throw new Error(`Tool ${name} is not implemented`);
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  return NextResponse.json({ configured: !!apiKey });
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables or .env.local file.',
      configured: false
    }, { status: 400 });
  }

  try {
    const { history = [], message, fileAttachment } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Process file attachment (if any) into base64 inlineData for Gemini multimodal capability
    let filePart = null;
    if (fileAttachment && fileAttachment.url) {
      try {
        const fileRes = await fetch(fileAttachment.url);
        if (fileRes.ok) {
          const arrayBuffer = await fileRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          filePart = {
            inlineData: {
              mimeType: fileAttachment.mimeType || 'image/jpeg',
              data: base64Data
            }
          };
        }
      } catch (err) {
        console.error("Error fetching file for Gemini multimodal request:", err);
      }
    }

    const userParts = [{ text: message }];
    if (filePart) {
      userParts.unshift(filePart);
    }

    // Format chat history for Gemini API
    const chatMessages = [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: userParts }
    ];

    const systemInstruction = {
      parts: [{
        text: `You are Antigravity, the autonomous AI coding and administration assistant built into the admin session of Glory Adeniran's portfolio.
Your role is to help the admin manage the site dynamically. You have direct access to tools that can read and write projects, work experience entries, and profile settings.
Always assume the user is the admin who owns the site.
When the user asks to view, edit, add, or delete content, do it by calling the appropriate tool.
Confirm what you have changed. Keep your explanations concise, professional, and clear.
Use clean markdown to format your text.

**Project Categories:**
Project categories are fully dynamic! To see existing categories, fetch settings using get_profile_settings.
If the user wants to add a project under a new category (e.g., 'slide design'), do not decline!
Instead, suggest creating a new category:
1. Register/create the category first by calling update_profile_settings and adding/modifying the 'categories' list. Provide a suitable snake_case key (e.g. 'slide_design'), display label (e.g. 'Slide Design'), sequential tag (e.g. '05'), and subtitle.
2. Then, call add_project with that category.

**Guided Project Creation Flow (Proactive Assistant):**
You must be skilled at guiding the user step-by-step when creating or updating projects. If details are missing, do not make assumptions or leave fields empty; proactively engage:
- Ask clarifying questions about missing fields (e.g., subcategory, description, main links, cover image/video, or additional gallery assets).
- If the user doesn't have a cover image/video, suggest a suitable Unsplash image URL that matches the project's vibe, or offer to use a default placeholder, or remind them they can upload files via the UPLOAD button in the admin edit modal.
- Proactively suggest adding relevant gallery assets or main links (e.g., GitHub or live demo links) to make the portfolio look premium and complete.
- Be friendly, collaborative, and conversational in asking these questions.

**Dynamic Styling (Redesigning the site):**
You can redesign the site's layout, styles, and color themes! The site uses CSS variables defined in :root. You can override these variables by providing a string of custom CSS and calling the tool \`update_profile_settings({ customCSS: 'css_code' })\`.
Key CSS variables you can override:
- \`--bg\` (background color, default #080706)
- \`--bg-2\` (sidebar/secondary background, default #0E0E10)
- \`--bg-card\` (card transparent background, default rgba(14, 14, 16, 0.62))
- \`--lime\` (accent color, default #0091FF)
- \`--lime-glow\` (glow color, default rgba(0, 145, 255, 0.25))
- \`--white\` (primary text color, default #FAFAFA)
- \`--border\` (border color, default rgba(255,255,255,0.08))
You can also inject other custom styles, layouts, or fonts! Any CSS you write will be dynamically injected into the head of the pages. Confirm what you changed.`
      }]
    };

    const tools = [{
      functionDeclarations: [
        {
          name: "get_projects",
          description: "Retrieve all portfolio projects grouped by category."
        },
        {
          name: "add_project",
          description: "Add a new project to the website portfolio.",
          parameters: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING", description: "The category key to add to (e.g., 'graphic_design', or any custom category key registered in settings)" },
              title: { type: "STRING", description: "The title of the project" },
              subcategory: { type: "STRING", description: "The subcategory or sub-title (e.g. Mobile UI/UX, Sports Graphics)" },
              description: { type: "STRING", description: "Short description of the project" },
              image: { type: "STRING", description: "Main image URL (use placeholder or search Unsplash)" },
              link: { type: "STRING", description: "Project link or GitHub repo" },
              details: { type: "STRING", description: "Extended details about the project" }
            },
            required: ["category", "title"]
          }
        },
        {
          name: "update_project",
          description: "Update an existing project's fields.",
          parameters: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING", description: "The category key the project belongs to (e.g., 'graphic_design', or any custom category key registered in settings)" },
              projectId: { type: "STRING", description: "The unique ID of the project to update" },
              title: { type: "STRING" },
              subcategory: { type: "STRING" },
              description: { type: "STRING" },
              image: { type: "STRING" },
              link: { type: "STRING" },
              details: { type: "STRING" }
            },
            required: ["category", "projectId"]
          }
        },
        {
          name: "delete_project",
          description: "Delete an existing project.",
          parameters: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING", description: "The category the project belongs to" },
              projectId: { type: "STRING", description: "The ID of the project to delete" }
            },
            required: ["category", "projectId"]
          }
        },
        {
          name: "get_experience",
          description: "Retrieve all work history/experience entries."
        },
        {
          name: "add_experience",
          description: "Add a new work experience entry.",
          parameters: {
            type: "OBJECT",
            properties: {
              role: { type: "STRING", description: "Role title, e.g. Lead Designer" },
              company: { type: "STRING", description: "Company name, e.g. Google" },
              period: { type: "STRING", description: "Period of employment, e.g. 2024 - Present" },
              description: { type: "STRING", description: "Role description and accomplishments" }
            },
            required: ["role", "company", "period"]
          }
        },
        {
          name: "update_experience",
          description: "Update an existing experience entry.",
          parameters: {
            type: "OBJECT",
            properties: {
              entryId: { type: "STRING", description: "The ID of the experience entry" },
              role: { type: "STRING" },
              company: { type: "STRING" },
              period: { type: "STRING" },
              description: { type: "STRING" }
            },
            required: ["entryId"]
          }
        },
        {
          name: "delete_experience",
          description: "Delete an experience entry.",
          parameters: {
            type: "OBJECT",
            properties: {
              entryId: { type: "STRING", description: "The ID of the entry to delete" }
            },
            required: ["entryId"]
          }
        },
        {
          name: "get_profile_settings",
          description: "Retrieve profile info, email, links, tools, services, and other site-wide settings."
        },
        {
          name: "update_profile_settings",
          description: "Update profile and ecosystem settings.",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Display name" },
              title: { type: "STRING", description: "Role title" },
              bio: { type: "STRING", description: "Short biography" },
              email: { type: "STRING" },
              location: { type: "STRING" },
              instagram: { type: "STRING" },
              facebook: { type: "STRING" },
              availability: { type: "STRING", description: "e.g. AVAILABLE_FOR_FREELANCE" },
              musicEnabled: { type: "BOOLEAN", description: "Enable or disable Spotify background player" },
              services: { type: "ARRAY", items: { type: "STRING" }, description: "List of services offered" },
              tools: { type: "ARRAY", items: { type: "STRING" }, description: "List of tools in the arsenal" },
              customCSS: { type: "STRING", description: "Custom CSS overrides to redesign the site's layout and colors." },
              categories: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    key: { type: "STRING", description: "Unique snake_case key for the category, e.g., 'slide_design'" },
                    label: { type: "STRING", description: "Display name for the category, e.g., 'Slide Design'" },
                    tag: { type: "STRING", description: "Category tag number, e.g., '05'" },
                    sub: { type: "STRING", description: "Subtitle/disciplines, e.g., 'Keynote · Pitch Decks · PowerPoint'" }
                  },
                  required: ["key", "label"]
                },
                description: "Update the list of categories on the portfolio."
              }
            }
          }
        }
      ]
    }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    let actionExecuted = false;
    let loopCount = 0;
    const maxLoops = 5;
    let finalContent = '';

    while (loopCount < maxLoops) {
      const reqBody = {
        contents: chatMessages,
        systemInstruction,
        tools,
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini error:', errorText);
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const resData = await response.json();
      const candidate = resData.candidates?.[0];
      if (!candidate || !candidate.content) {
        throw new Error("Invalid response from Gemini API");
      }

      // Append assistant turn to chat messages
      const modelContent = candidate.content;
      chatMessages.push(modelContent);

      const parts = modelContent.parts || [];
      const textPart = parts.find(p => p.text);
      if (textPart) {
        finalContent = textPart.text;
      }

      const functionCalls = parts.filter(p => p.functionCall);
      if (functionCalls.length === 0) {
        // No function calls, we are finished
        break;
      }

      // Execute tool calls
      const functionResponseParts = [];
      for (const call of functionCalls) {
        const { name, args } = call.functionCall;
        let result;
        try {
          result = await executeTool(name, args);
          actionExecuted = true;
        } catch (err) {
          console.error(`Error executing tool ${name}:`, err);
          result = { error: err.message };
        }

        functionResponseParts.push({
          functionResponse: {
            name,
            response: { result }
          }
        });
      }

      // Append function response turn to chat messages
      chatMessages.push({
        role: 'function',
        parts: functionResponseParts
      });

      loopCount++;
    }

    return NextResponse.json({ 
      response: finalContent || "Done.", 
      actionExecuted 
    });

  } catch (error) {
    console.error('[chat/route.js] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
