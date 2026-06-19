import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyABvgYHF0HC0Hd4bcnlbTlHaZa1zW5mUgs',
  authDomain: 'lecturepulse-f0489.firebaseapp.com',
  projectId: 'lecturepulse-f0489',
  storageBucket: 'lecturepulse-f0489.firebasestorage.app',
  messagingSenderId: '205218040801',
  appId: '1:205218040801:web:bc3a6ac5f524100b9aa0a0',
  measurementId: 'G-7RE2JH2YRY',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

let analytics: Analytics | null = null

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export { analytics }
