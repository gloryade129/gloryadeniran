/**
 * src/supabase-auth-adapter.js
 * Hybrid Baileys Auth State with Supabase Cloud Backup & Local File Cache
 * 
 * Ensures WhatsApp multi-device authentication keys survive container
 * restarts, deployments, and machine changes without re-scanning QR codes.
 */

import fs from 'fs/promises';
import path from 'path';
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

/**
 * Clears corrupted or logged-out session from local disk and Supabase
 */
export async function clearSession(supabase, sessionDir = './session_auth') {
  try {
    const files = await fs.readdir(sessionDir);
    for (const f of files) {
      await fs.unlink(path.join(sessionDir, f)).catch(() => {});
    }
    console.log('[auth-adapter] Cleared local session files.');
  } catch {}

  if (supabase) {
    try {
      await supabase.from('gods_virtue_sessions').delete().eq('session_id', 'default');
      console.log('[auth-adapter] Cleared remote Supabase session keys for default.');
    } catch (e) {
      console.warn('[auth-adapter] Failed to clear Supabase sessions:', e.message);
    }
  }
}

export async function useSupabaseAuthState(supabase, sessionDir = './session_auth') {
  // Ensure local session directory exists
  await fs.mkdir(sessionDir, { recursive: true });

  const credsFilePath = path.join(sessionDir, 'creds.json');

  // Step 1: Restore from Supabase if local creds are missing
  if (supabase) {
    try {
      let localExists = false;
      try {
        await fs.access(credsFilePath);
        localExists = true;
      } catch {}

      if (!localExists) {
        console.log('[auth-adapter] Checking Supabase for remote WhatsApp session credentials...');
        const { data, error } = await supabase
          .from('gods_virtue_sessions')
          .select('key_id, value')
          .eq('session_id', 'default');

        // Only restore if we have valid credentials AND associated keys (not just an orphaned creds file)
        if (data && data.length > 1) {
          console.log(`[auth-adapter] Restoring ${data.length} session items from Supabase...`);
          for (const item of data) {
            const dest = path.join(sessionDir, `${item.key_id}.json`);
            await fs.writeFile(dest, JSON.stringify(item.value), 'utf-8');
          }
          console.log('[auth-adapter] Session restored successfully from Supabase!');
        } else if (data && data.length === 1) {
          console.log('[auth-adapter] Detected partial/orphaned session (1 item). Discarding to prevent 401 handshake loop.');
          await clearSession(supabase, sessionDir);
        }
      }
    } catch (err) {
      console.warn('[auth-adapter] Supabase session restore warning:', err.message);
    }
  }

  // Step 2: Read or initialize credentials
  let creds;
  try {
    const raw = await fs.readFile(credsFilePath, 'utf-8');
    creds = JSON.parse(raw, BufferJSON.reviver);
  } catch {
    creds = initAuthCreds();
    await fs.writeFile(credsFilePath, JSON.stringify(creds, BufferJSON.replacer, 2));
  }

  // Step 3: Implement Baileys state handlers
  const saveCreds = async () => {
    try {
      const serialized = JSON.stringify(creds, BufferJSON.replacer, 2);
      await fs.writeFile(credsFilePath, serialized, 'utf-8');

      if (supabase) {
        await supabase.from('gods_virtue_sessions').upsert({
          session_id: 'default',
          data_type: 'creds',
          key_id: 'creds',
          value: JSON.parse(serialized),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,key_id' });
      }
    } catch (err) {
      console.warn('[auth-adapter] Save creds warning:', err.message);
    }
  };

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        for (const id of ids) {
          try {
            const raw = await fs.readFile(path.join(sessionDir, `${type}-${id}.json`), 'utf-8');
            data[id] = JSON.parse(raw, BufferJSON.reviver);
          } catch {
            data[id] = null;
          }
        }
        return data;
      },
      set: async (data) => {
        const upsertBatch = [];
        for (const category in data) {
          for (const id in data[category]) {
            const val = data[category][id];
            const filename = `${category}-${id}.json`;
            const filePath = path.join(sessionDir, filename);

            if (val) {
              const str = JSON.stringify(val, BufferJSON.replacer);
              await fs.writeFile(filePath, str, 'utf-8');
              if (supabase) {
                upsertBatch.push({
                  session_id: 'default',
                  data_type: 'key',
                  key_id: `${category}-${id}`,
                  value: JSON.parse(str),
                  updated_at: new Date().toISOString(),
                });
              }
            } else {
              try {
                await fs.unlink(filePath);
              } catch {}
            }
          }
        }
        if (supabase && upsertBatch.length > 0) {
          supabase
            .from('gods_virtue_sessions')
            .upsert(upsertBatch, { onConflict: 'session_id,key_id' })
            .then(() => {})
            .catch((e) => console.warn('[auth-adapter] Key sync error:', e.message));
        }
      },
    },
  };

  return { state, saveCreds };
}
