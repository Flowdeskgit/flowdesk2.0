import { describe, expect, it } from 'vitest';
import {
  buildImportRow,
  parseCell,
  remapBase44References,
  uuidFromText,
} from './import-base44-csvs.mjs';

describe('Base44 CSV import helpers', () => {
  it('builds deterministic UUIDs from Base44 ids', () => {
    const sourceId = '664f1bb6e4b03c5f7d2f9a10';
    const uuid = uuidFromText(sourceId);

    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(uuidFromText(sourceId)).toBe(uuid);
  });

  it('remaps relationship fields while preserving normal strings', () => {
    const sourceId = '664f1bb6e4b03c5f7d2f9a10';

    expect(remapBase44References(sourceId)).toBe(uuidFromText(sourceId));
    expect(remapBase44References('regular text')).toBe('regular text');
  });

  it('converts a CSV record into the Supabase JSONB row shape', () => {
    const sourceId = '664f1bb6e4b03c5f7d2f9a10';
    const clienteId = '665091e4d2d71f2f88434567';
    const row = buildImportRow('Processo', {
      id: sourceId,
      cliente_id: clienteId,
      titulo: 'Processo teste',
      created_date: '2026-05-24T10:00:00.000Z',
      updated_date: '2026-05-25T10:00:00.000Z',
      is_sample: 'false',
    }, 'owner-user-id');

    expect(row).toMatchObject({
      id: uuidFromText(sourceId),
      user_id: 'owner-user-id',
      created_at: '2026-05-24T10:00:00.000Z',
      updated_at: '2026-05-25T10:00:00.000Z',
      data: {
        base44_id: sourceId,
        base44_entity: 'Processo',
        cliente_id: uuidFromText(clienteId),
        titulo: 'Processo teste',
      },
    });
    expect(row.data).not.toHaveProperty('is_sample');
  });

  it('parses booleans and JSON cells without coercing ordinary text', () => {
    expect(parseCell('true')).toBe(true);
    expect(parseCell('{"a":1}')).toEqual({ a: 1 });
    expect(parseCell('00123')).toBe('00123');
    expect(parseCell('')).toBeUndefined();
  });
});
