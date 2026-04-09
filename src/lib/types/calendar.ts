import type { EventAssignmentRecord } from '../pocketbase/event-assignments';
import type { CalendarEventRecord } from '../pocketbase/events';

export type CalendarItemRecord = CalendarEventRecord & {
  assignees: EventAssignmentRecord[];
  assigneeNames: string[];
};
