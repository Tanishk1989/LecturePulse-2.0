import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getPublicStorageUrl, uploadFileWithProgress } from '@/lib/storageUpload'

const AVATARS_BUCKET = 'documents'
import { getAuthErrorMessage } from '@/lib/authErrors'

export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'password')
}

export function isGoogleOnlyUser(user: User): boolean {
  return user.providerData.every((provider) => provider.providerId === 'google.com')
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to update your profile.')
  await updateProfile(user, { displayName: displayName.trim() })
}

export async function updateUserBio(_bio: string): Promise<void> {
  // Bio is stored in local preferences — no Firebase field
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const relativePath = `${userId}/avatar.${ext}`
  await uploadFileWithProgress(AVATARS_BUCKET, relativePath, file, file.type)
  const photoURL = await getPublicStorageUrl(AVATARS_BUCKET, relativePath)

  const user = auth.currentUser
  if (!user) throw new Error('Sign in to update your profile photo.')
  await updateProfile(user, { photoURL })

  return photoURL
}

export async function requestEmailChange(newEmail: string, currentPassword?: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to change your email.')

  if (isGoogleOnlyUser(user)) {
    throw new Error('Email is managed by your Google account. Update it in Google settings.')
  }

  if (!currentPassword) {
    throw new Error('Enter your current password to change your email.')
  }

  const credential = EmailAuthProvider.credential(user.email ?? '', currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updateEmail(user, newEmail.trim())
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = auth.currentUser
  if (!user?.email) throw new Error('Sign in to change your password.')

  if (!hasPasswordProvider(user)) {
    throw new Error('Password change is only available for email/password accounts.')
  }

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.')
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export async function deleteFirebaseAccount(currentPassword?: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to delete your account.')

  if (hasPasswordProvider(user) && user.email && currentPassword) {
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
  }

  try {
    await user.delete()
  } catch (error) {
    throw new Error(
      getAuthErrorMessage(error) ||
        'Could not delete your auth account. Sign in again and retry, or contact support.',
    )
  }
}

import { apiFetch } from '@/lib/api'

export interface UserProfile {
  userId: string
  course: string | null
  studyGoal: string | null
  tutorStyle: string | null
  summaryLength: string | null
  flashcardDifficulty: string | null
  dailyReminder: boolean
  dailyReminderTime: string | null
  streakAlerts: boolean
  createdAt: string
  updatedAt: string
}

let cachedProfile: UserProfile | null = null

export function getCachedProfile(): UserProfile | null {
  if (cachedProfile) return cachedProfile
  const saved = localStorage.getItem('lecturepulse:user_profile')
  if (saved) {
    try {
      cachedProfile = JSON.parse(saved)
      return cachedProfile
    } catch {
      // ignore
    }
  }
  return null
}

export function setCachedProfile(profile: UserProfile | null): void {
  cachedProfile = profile
  if (profile) {
    localStorage.setItem('lecturepulse:user_profile', JSON.stringify(profile))
  } else {
    localStorage.removeItem('lecturepulse:user_profile')
  }
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const profile = await apiFetch<UserProfile>('/profiles')
  setCachedProfile(profile)
  return profile
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const profile = await apiFetch<UserProfile>('/profiles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  setCachedProfile(profile)
  return profile
}

export async function deleteUserProfile(): Promise<void> {
  await apiFetch('/profiles', {
    method: 'DELETE',
  })
  setCachedProfile(null)
}
