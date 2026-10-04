import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import path from 'node:path'
import fs from 'node:fs'

function projectId(): string {
  const configured = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
  if (configured) return configured
  // Compatibility during rollout: extract only the public project ID from legacy configuration.
  for (const json of [process.env.FIREBASE_CONFIG, process.env.FIREBASE_SERVICE_ACCOUNT_KEY, process.env.FIREBASE_SERVICE_ACCOUNT, process.env.FIREBASE_SERVICE_ACCOUNT_JSON]) {
    if (!json) continue
    try { const parsed=JSON.parse(json);if(parsed.projectId||parsed.project_id)return parsed.projectId||parsed.project_id } catch { /* No secrets in diagnostics. */ }
  }
  const file=process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(),'firebase-service-account.json')
  if (fs.existsSync(file)) {
    try {const parsed=JSON.parse(fs.readFileSync(file,'utf8'));if(parsed.project_id)return parsed.project_id} catch {}
  }
  throw Error('FIREBASE_PROJECT_ID is required for authentication.')
}

if (getApps().length===0) initializeApp({
  projectId: projectId(),
  // Verification checks Google's public signing certificates; no admin private key is needed.
  // Future admin operations must not silently acquire broad application-default credentials.
  credential: { getAccessToken: async () => {throw Error('Administrative Firebase operations are disabled on this API.')} },
})
export const firebaseAuth=getAuth()
