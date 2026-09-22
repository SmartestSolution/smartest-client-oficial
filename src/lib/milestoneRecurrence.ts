export type RecurringMilestone = {
  id: string;
  due_date: string;
  start_date?: string | null;
  recurrence?: string | null;
};

export type ExpandedMilestone<T> = T & {
  occurrence_key: string;
  occurrence_date: string;
  series_start_date: string;
  series_end_date: string;
};

const parseDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);
const formatDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function expandMilestoneRecurrence<T extends RecurringMilestone>(milestones: T[]): ExpandedMilestone<T>[] {
  return milestones.flatMap(milestone => {
    const seriesStart = milestone.start_date || milestone.due_date;
    const seriesEnd = milestone.due_date;
    const recurring = milestone.recurrence === 'weekly' || milestone.recurrence === 'monthly';

    if (!recurring) {
      return [{
        ...milestone,
        occurrence_key: `${milestone.id}-${seriesEnd}`,
        occurrence_date: seriesEnd,
        series_start_date: seriesStart,
        series_end_date: seriesEnd,
      }];
    }

    const current = parseDate(seriesStart);
    const end = parseDate(seriesEnd);
    if (current > end) return [];

    const occurrences: ExpandedMilestone<T>[] = [];
    while (current <= end) {
      const occurrenceDate = formatDate(current);
      occurrences.push({
        ...milestone,
        due_date: occurrenceDate,
        occurrence_key: `${milestone.id}-${occurrenceDate}`,
        occurrence_date: occurrenceDate,
        series_start_date: seriesStart,
        series_end_date: seriesEnd,
      });
      if (milestone.recurrence === 'weekly') current.setDate(current.getDate() + 7);
      else current.setMonth(current.getMonth() + 1);
    }
    return occurrences;
  });
}