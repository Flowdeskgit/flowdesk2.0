import { describe, expect, it } from 'vitest';
import {
  dataFieldsFromRecord,
  flattenRow,
  sortRows,
  splitCriteria,
} from './flowdeskClient';

describe('flowdesk entity helpers', () => {
  it('flattens JSONB rows into the shape used by the app', () => {
    const row = {
      id: 'row-id',
      user_id: 'user-id',
      created_at: '2026-05-24T10:00:00Z',
      updated_at: '2026-05-24T11:00:00Z',
      data: { id: 'nested-id', nome: 'Cliente A', status: 'Ativo' },
    };

    expect(flattenRow(row)).toEqual({
      id: 'row-id',
      user_id: 'user-id',
      created_at: '2026-05-24T10:00:00Z',
      created_date: '2026-05-24T10:00:00Z',
      updated_at: '2026-05-24T11:00:00Z',
      updated_date: '2026-05-24T11:00:00Z',
      nome: 'Cliente A',
      status: 'Ativo',
    });
  });

  it('splits top-level filters from JSONB data filters', () => {
    expect(splitCriteria({
      id: 'abc',
      created_date: '2026-05-24',
      status: 'Pendente',
      cliente_id: 'cliente-1',
    })).toEqual({
      topLevel: {
        id: 'abc',
        created_at: '2026-05-24',
      },
      data: {
        status: 'Pendente',
        cliente_id: 'cliente-1',
      },
    });
  });

  it('removes reserved fields from JSONB payloads', () => {
    expect(dataFieldsFromRecord({
      id: 'abc',
      user_id: 'user',
      created_date: 'ignored',
      nome: 'Cliente',
      ativo: true,
    })).toEqual({
      nome: 'Cliente',
      ativo: true,
    });
  });

  it('sorts records using app sort strings', () => {
    const rows = [
      { nome: 'Item 10', created_date: '2026-05-22T10:00:00Z' },
      { nome: 'Item 2', created_date: '2026-05-24T10:00:00Z' },
      { nome: 'Item 1', created_date: '2026-05-23T10:00:00Z' },
    ];

    expect(sortRows(rows, '-created_date').map((row) => row.nome)).toEqual(['Item 2', 'Item 1', 'Item 10']);
    expect(sortRows(rows, 'nome').map((row) => row.nome)).toEqual(['Item 1', 'Item 2', 'Item 10']);
  });
});
