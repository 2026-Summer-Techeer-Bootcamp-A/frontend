import assert from 'node:assert/strict'
import test from 'node:test'

test('loads available bookmarked postings as chat attachments in bookmark order', async () => {
  const module = await import('../src/rag/bookmarkAttachments.ts').catch(() => ({
    loadBookmarkAttachments: undefined,
  }))

  assert.equal(
    typeof module.loadBookmarkAttachments,
    'function',
    'loadBookmarkAttachments should be implemented',
  )

  const attachments = await module.loadBookmarkAttachments!(
    ['12', '99', '7'],
    async (id: string) => {
      if (id === '99') throw new Error('posting not found')
      return {
        id: Number(id),
        title: id === '12' ? 'Backend Engineer' : 'Platform Engineer',
        company: id === '12' ? 'Acme' : 'Orbit',
      }
    },
  )

  assert.deepEqual(attachments, [
    { kind: 'posting', id: 12, title: 'Backend Engineer', subtitle: 'Acme' },
    { kind: 'posting', id: 7, title: 'Platform Engineer', subtitle: 'Orbit' },
  ])
})
