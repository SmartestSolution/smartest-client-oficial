import { describe, expect, it } from 'vitest';
import { expandMilestoneRecurrence } from '@/lib/milestoneRecurrence';

describe('expandMilestoneRecurrence', () => {
  it('mantém compromisso único com início e término registrados', () => {
    const result = expandMilestoneRecurrence([
      { id: 'a', start_date: '2026-06-16', due_date: '2026-06-16', recurrence: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].series_start_date).toBe('2026-06-16');
    expect(result[0].series_end_date).toBe('2026-06-16');
  });

  it('expande recorrência semanal dentro do período', () => {
    const result = expandMilestoneRecurrence([
      { id: 'b', start_date: '2026-06-01', due_date: '2026-06-29', recurrence: 'weekly' },
    ]);
    expect(result.map(r => r.occurrence_date)).toEqual([
      '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29',
    ]);
    expect(result.every(r => r.series_start_date === '2026-06-01' && r.series_end_date === '2026-06-29')).toBe(true);
  });

  it('expande recorrência mensal dentro do período', () => {
    const result = expandMilestoneRecurrence([
      { id: 'c', start_date: '2026-01-10', due_date: '2026-04-10', recurrence: 'monthly' },
    ]);
    expect(result.map(r => r.occurrence_date)).toEqual([
      '2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10',
    ]);
  });

  it('ignora série com término anterior ao início', () => {
    expect(expandMilestoneRecurrence([
      { id: 'd', start_date: '2026-05-10', due_date: '2026-05-01', recurrence: 'weekly' },
    ])).toHaveLength(0);
  });
});
