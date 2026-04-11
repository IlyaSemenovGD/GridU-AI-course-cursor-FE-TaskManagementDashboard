import { describe, expect, it } from 'vitest'

import { KANBAN_MIME, parseKanbanPayload } from './kanbanDnD'

function makeDataTransfer(json: string): DataTransfer {
  const store: Record<string, string> = { [KANBAN_MIME]: json }
  return {
    getData: (mime: string) => store[mime] ?? '',
  } as DataTransfer
}

describe('parseKanbanPayload', () => {
  it('parses valid payload', () => {
    const dt = makeDataTransfer(JSON.stringify({ taskId: 't-1' }))
    expect(parseKanbanPayload(dt)).toEqual({ taskId: 't-1' })
  })

  it('returns null for empty or invalid data', () => {
    expect(parseKanbanPayload(makeDataTransfer(''))).toBeNull()
    expect(parseKanbanPayload(makeDataTransfer('not-json'))).toBeNull()
    expect(parseKanbanPayload(makeDataTransfer('{}'))).toBeNull()
  })
})
