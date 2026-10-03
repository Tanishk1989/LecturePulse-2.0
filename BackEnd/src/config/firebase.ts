import { applicationDefault, cert, getApps, initializeApp, type Credential, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as path from 'path'
import * as fs from 'fs'

function getCredential(): ServiceAccount | Credential {
  const envJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (envJson) {
    try {
      return JSON.parse(envJson) as ServiceAccount
    } catch {
      console.error('Failed to parse Firebase service account JSON from environment.')
    }
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), 'firebase-service-account.json')
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ServiceAccount
    } catch {
      console.error('Failed to parse Firebase credential file.')
    }
  }

  console.warn('No service account credentials found. Falling back to applicationDefault credentials.')
  return applicationDefault()
}

const credential = getCredential()

if (getApps().length === 0) {
  const isServiceAccount =
    typeof credential === 'object' &&
    credential !== null &&
    ('project_id' in credential || 'projectId' in credential)
  initializeApp({
    credential: isServiceAccount
      ? cert(credential as ServiceAccount)
      : (credential as Credential),
  })
}

export const firebaseAuth = getAuth()
