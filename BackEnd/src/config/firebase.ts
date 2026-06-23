import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

function getCredential(): admin.ServiceAccount | admin.credential.Credential {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (envKey) {
    try {
      return JSON.parse(envKey) as admin.ServiceAccount
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env string:', e)
    }
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), 'firebase-service-account.json')
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as admin.ServiceAccount
    } catch (e) {
      console.error('Failed to parse Firebase credential file at path:', filePath, e)
    }
  }

  console.warn('No service account credentials found. Falling back to applicationDefault credentials.')
  return admin.credential.applicationDefault()
}

const credential = getCredential()

if (admin.apps.length === 0) {
  const isServiceAccount =
    typeof credential === 'object' &&
    credential !== null &&
    ('project_id' in credential || 'projectId' in credential)
  admin.initializeApp({
    credential: isServiceAccount
      ? admin.credential.cert(credential as admin.ServiceAccount)
      : (credential as admin.credential.Credential),
  })
}

export { admin }
