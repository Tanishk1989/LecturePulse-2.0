import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import { tmpdir } from 'node:os'

process.env.UPLOADS_DIR = path.join(tmpdir(), 'lecturepulse-storage-path-tests')
process.env.PUBLIC_BASE_URL = 'https://api.example.test'
process.env.SUPABASE_URL = 'https://project.example.test'

const storage = await import('../dist/config/storage.js')

test('media links reject missing, expired, and altered signatures', () => {
  const signed = new URL(storage.getAccessibleFileUrl(storage.buildFileUrl('lectures', 'user-1/audio.wav')))
  const expires = signed.searchParams.get('expires')
  const signature = signed.searchParams.get('signature')
  assert.equal(storage.verifyMediaSignature('lectures', 'user-1/audio.wav', expires, signature), true)
  assert.equal(storage.verifyMediaSignature('lectures', 'user-2/audio.wav', expires, signature), false)
  assert.equal(storage.verifyMediaSignature('lectures', 'user-1/audio.wav', '1', signature), false)
  assert.equal(storage.verifyMediaSignature('lectures', 'user-1/audio.wav', '', ''), false)
  assert.throws(() => storage.canonicalOwnedFileUrl(signed.href, 'user-2'))
  assert.equal(storage.canonicalOwnedFileUrl(signed.href, 'user-1'), storage.buildFileUrl('lectures', 'user-1/audio.wav'))
})

test('accepts owned paths in each supported category', () => {
  for (const category of ['lectures', 'documents', 'avatars']) {
    storage.assertUserOwnsRelativePath('user-1', 'user-1/file.txt')
    assert.equal(
      storage.getAbsolutePath(category, 'user-1/file.txt'),
      path.resolve(process.env.UPLOADS_DIR, category, 'user-1', 'file.txt'),
    )
  }
})

test('rejects traversal and ambiguous paths', () => {
  for (const unsafe of [
    'user-1/../user-2/file.txt',
    'user-1\\..\\user-2\\file.txt',
    '/user-1/file.txt',
    'user-1//file.txt',
    'user-1/./file.txt',
    'user-1/file.txt/',
    'user-1/C:/file.txt',
  ]) {
    assert.throws(() => storage.assertUserOwnsRelativePath('user-1', unsafe))
    assert.throws(() => storage.getAbsolutePath('lectures', unsafe))
  }
  assert.throws(() => storage.assertUserOwnsRelativePath('user-1', 'user-2/file.txt'))
  assert.throws(() => storage.getAbsolutePath('../other', 'user-1/file.txt'))
})

test('local URL resolution is limited to this backend origin', () => {
  const url = storage.buildFileUrl('documents', 'user-1/my notes #1.pdf')
  assert.equal(
    storage.resolveLocalPathFromUrl(url),
    path.resolve(process.env.UPLOADS_DIR, 'documents', 'user-1', 'my notes #1.pdf'),
  )
  assert.equal(
    storage.resolveLocalPathFromUrl('https://other.example.test/uploads/documents/user-1/file.pdf'),
    null,
  )
})

test('legacy storage references are restricted to this project and owner', () => {
  const legacy = 'https://project.example.test/storage/v1/object/public/documents/user-1/notes.pdf'
  assert.equal(storage.canonicalOwnedFileUrl(legacy, 'user-1'), 'https://api.example.test/uploads/documents/user-1/notes.pdf')
  assert.throws(() => storage.canonicalOwnedFileUrl(legacy, 'user-2'))
  assert.equal(storage.parseStoredFileUrl(legacy.replace('project.example.test', 'other.example.test')), null)
})
