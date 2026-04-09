import { render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorCalendarPage from './professor-calendar';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  listCalendarEventsInRange: vi.fn(),
  listEventAssignmentsByEventIds: vi.fn(),
  calendarInstances: [] as any[],
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@fullcalendar/core', () => ({
  Calendar: class MockCalendar {
    constructor(el, options) {
      this.el = el;
      this.options = options;
      this.render = vi.fn();
      this.destroy = vi.fn();
      this.setOption = vi.fn((name, value) => {
        this.options = {
          ...this.options,
          [name]: value,
        };
      });
      mocks.calendarInstances.push(this);
    }
  },
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/list', () => ({ default: {} }));
vi.mock('@fullcalendar/core/locales/es', () => ({ default: {} }));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
}));

vi.mock('../lib/pocketbase/events', () => ({
  listCalendarEventsInRange: mocks.listCalendarEventsInRange,
}));

vi.mock('../lib/pocketbase/event-assignments', () => ({
  listEventAssignmentsByEventIds: mocks.listEventAssignmentsByEventIds,
}));

const eventsFixture = [
  {
    id: 'evt1',
    title: 'Consejo académico',
    description: 'Revisión del cronograma del semestre',
    startDateTime: '2026-04-10T14:00:00.000Z',
    endDateTime: '2026-04-10T15:00:00.000Z',
    isAllDay: false,
    kind: 'event',
    status: 'planned',
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    isDeleted: false,
  },
];

const assignmentsFixture = [
  {
    id: 'a1',
    eventId: 'evt1',
    employeeId: 'emp1',
    employeeName: 'Ana Gomez',
    employeeActive: true,
  },
];

function getCalendarInstance() {
  const instance = mocks.calendarInstances[0];
  if (!instance) {
    throw new Error('Calendar instance not found');
  }
  return instance;
}

describe('ProfessorCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendarInstances.length = 0;
    mocks.canAccessModule.mockReturnValue(true);
    mocks.listCalendarEventsInRange.mockResolvedValue(eventsFixture);
    mocks.listEventAssignmentsByEventIds.mockResolvedValue(assignmentsFixture);
  });

  it('redirects unauthorized users', async () => {
    mocks.canAccessModule.mockReturnValue(false);

    render(() => <ProfessorCalendarPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('opens a read-only preview modal on event click and removes tooltip mounting', async () => {
    render(() => <ProfessorCalendarPage />);

    await waitFor(() => {
      const instance = getCalendarInstance();
      expect((instance.options.events as unknown[] | undefined)?.length).toBe(1);
    });

    const calendar = getCalendarInstance();
    expect(calendar.options.eventDidMount).toBeUndefined();
    expect(typeof calendar.options.eventClick).toBe('function');

    (calendar.options.eventClick as ((arg: unknown) => void))?.({
      event: { id: 'evt1' },
    });

    expect(await screen.findByRole('heading', { name: 'Consejo académico' })).toBeInTheDocument();
    expect(screen.getByText('Revisión del cronograma del semestre')).toBeInTheDocument();
    expect(screen.getByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
