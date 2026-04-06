import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventManagementCalendarPage from './event-management-calendar';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listCalendarEventsInRange: vi.fn(),
  listEventAssignmentsByEventIds: vi.fn(),
  deleteEventAssignmentsByEventId: vi.fn(),
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  syncEventAssignments: vi.fn(),
  listActiveEmployees: vi.fn(),
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
      this.prev = vi.fn();
      this.next = vi.fn();
      this.today = vi.fn();
      mocks.calendarInstances.push(this);
    }
  },
}));

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/list', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));
vi.mock('@fullcalendar/core/locales/es', () => ({ default: {} }));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/events', () => ({
  CALENDAR_EVENT_KINDS: ['event', 'task'],
  CALENDAR_EVENT_STATUSES: ['planned', 'done', 'cancelled'],
  listCalendarEventsInRange: mocks.listCalendarEventsInRange,
  createCalendarEvent: mocks.createCalendarEvent,
  updateCalendarEvent: mocks.updateCalendarEvent,
  deleteCalendarEvent: mocks.deleteCalendarEvent,
}));

vi.mock('../lib/pocketbase/event-assignments', () => ({
  listEventAssignmentsByEventIds: mocks.listEventAssignmentsByEventIds,
  deleteEventAssignmentsByEventId: mocks.deleteEventAssignmentsByEventId,
  syncEventAssignments: mocks.syncEventAssignments,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  listActiveEmployees: mocks.listActiveEmployees,
}));

const eventsFixture = [
  {
    id: 'evt1',
    title: 'Reunión general',
    description: 'Seguimiento administrativo',
    startDateTime: '2026-04-10T14:00:00.000Z',
    endDateTime: '2026-04-10T15:00:00.000Z',
    isAllDay: false,
    kind: 'task',
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

const employeesFixture = [
  {
    id: 'emp1',
    name: 'Ana Gomez',
    documentId: '1001',
    email: 'ana@example.com',
    phone: '3000000000',
    address: 'Calle 1',
    emergency_contact: 'Luis',
    active: true,
    userId: 'u1',
    jobId: 'job1',
    jobName: 'Docente',
    jobSalary: 1000,
    cvFileName: '',
    cvUrl: null,
  },
  {
    id: 'emp2',
    name: 'Luis Perez',
    documentId: '1002',
    email: 'luis@example.com',
    phone: '3000000001',
    address: 'Calle 2',
    emergency_contact: 'Ana',
    active: true,
    userId: 'u2',
    jobId: 'job2',
    jobName: 'Coordinador',
    jobSalary: 1000,
    cvFileName: '',
    cvUrl: null,
  },
];

function getCalendarHost(): HTMLElement {
  const element = document.querySelector('.event-management-calendar-host') as HTMLElement;
  if (!element) {
    throw new Error('Calendar host not found');
  }
  return element;
}

function getCalendarInstance() {
  const instance = mocks.calendarInstances[0];
  if (!instance) {
    throw new Error('Calendar instance not found');
  }
  return instance;
}

describe('EventManagementCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendarInstances.length = 0;
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listCalendarEventsInRange.mockResolvedValue(eventsFixture);
    mocks.listEventAssignmentsByEventIds.mockResolvedValue(assignmentsFixture);
    mocks.deleteEventAssignmentsByEventId.mockResolvedValue(undefined);
    mocks.createCalendarEvent.mockResolvedValue({ ...eventsFixture[0], id: 'evt-new', title: 'Nueva tarea' });
    mocks.updateCalendarEvent.mockResolvedValue(eventsFixture[0]);
    mocks.deleteCalendarEvent.mockResolvedValue(undefined);
    mocks.syncEventAssignments.mockResolvedValue(undefined);
    mocks.listActiveEmployees.mockResolvedValue(employeesFixture);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);

    render(() => <EventManagementCalendarPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/event-management', { replace: true });
    });
  });

  it('loads the calendar options with rendered events and preview behavior', async () => {
    render(() => <EventManagementCalendarPage />);

    const calendarHost = getCalendarHost();
    expect(calendarHost.parentElement).toHaveClass('event-management-calendar-shell');

    await waitFor(() => {
      const instance = getCalendarInstance();
      expect(Array.isArray(instance.options.events)).toBe(true);
      expect((instance.options.events as unknown[]).length).toBe(1);
    });

    expect(mocks.listCalendarEventsInRange).toHaveBeenCalled();
    expect(mocks.listEventAssignmentsByEventIds).toHaveBeenCalledWith(['evt1']);

    const calendar = getCalendarInstance();

    (calendar.options.eventClick as ((arg: unknown) => void))?.({
      event: { id: 'evt1' },
    });

    expect(await screen.findByText('Seguimiento administrativo')).toBeInTheDocument();
    expect(screen.getByText('Ana Gomez')).toBeInTheDocument();
  });

  it('creates a task and syncs assignees', async () => {
    render(() => <EventManagementCalendarPage />);

    await screen.findByText('Nuevo evento o tarea');
    fireEvent.click(screen.getByText('Nuevo evento o tarea'));

    fireEvent.input(screen.getByLabelText('Título'), { target: { value: 'Preparar informes' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'task' } });
    fireEvent.input(screen.getByLabelText('Inicio'), { target: { value: '2026-04-11T08:00' } });
    fireEvent.input(screen.getByLabelText('Fin'), { target: { value: '2026-04-11T10:00' } });
    fireEvent.click(screen.getByLabelText(/Ana Gomez/));

    fireEvent.click(screen.getByRole('button', { name: 'Crear elemento' }));

    await waitFor(() => {
      expect(mocks.createCalendarEvent).toHaveBeenCalledWith({
        title: 'Preparar informes',
        description: '',
        kind: 'task',
        status: 'planned',
        isAllDay: false,
        startDateTime: expect.stringMatching(/2026-04-11T/),
        endDateTime: expect.stringMatching(/2026-04-11T/),
      });
    });

    await waitFor(() => {
      expect(mocks.syncEventAssignments).toHaveBeenCalledWith('evt-new', ['emp1']);
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Título')).not.toBeInTheDocument();
    });
  });

  it('opens edit from the pencil icon and persists assignment changes', async () => {
    render(() => <EventManagementCalendarPage />);

    await waitFor(() => {
      const instance = getCalendarInstance();
      expect(typeof instance.options.eventContent).toBe('function');
      expect((instance.options.events as unknown[] | undefined)?.length).toBe(1);
    });

    const calendar = getCalendarInstance();
    const rendered = (calendar.options.eventContent as (arg: unknown) => { domNodes: Node[] })({
      event: {
        id: 'evt1',
        title: 'Reunión general',
      },
    });

    const pencilButton = (rendered.domNodes[0] as HTMLElement).querySelector('button');
    expect(pencilButton).not.toBeNull();
    expect(pencilButton?.getAttribute('aria-label')).toBe('Editar Reunión general');

    fireEvent.click(pencilButton!);

    expect(await screen.findByRole('heading', { name: 'Editar elemento del calendario' })).toBeInTheDocument();

    fireEvent.input(screen.getByLabelText('Título'), { target: { value: 'Reunión ajustada' } });
    fireEvent.click(screen.getByLabelText(/Luis Perez/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(mocks.updateCalendarEvent).toHaveBeenCalledWith('evt1', expect.objectContaining({
        title: 'Reunión ajustada',
      }));
    });

    await waitFor(() => {
      expect(mocks.syncEventAssignments).toHaveBeenCalledWith('evt1', ['emp1', 'emp2']);
    });
  });

  it('hard deletes the previewed item from the detail modal', async () => {
    render(() => <EventManagementCalendarPage />);

    await waitFor(() => {
      const instance = getCalendarInstance();
      expect(typeof instance.options.eventContent).toBe('function');
      expect((instance.options.events as unknown[] | undefined)?.length).toBe(1);
    });

    const calendar = getCalendarInstance();
    const rendered = (calendar.options.eventContent as (arg: unknown) => { domNodes: Node[] })({
      event: {
        id: 'evt1',
        title: 'Reunión general',
      },
    });

    (calendar.options.eventClick as ((arg: unknown) => void))?.({
      event: { id: 'evt1' },
    });

    expect(await screen.findByRole('heading', { name: 'Reunión general' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar elemento' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[1]);

    await waitFor(() => {
      expect(mocks.deleteEventAssignmentsByEventId).toHaveBeenCalledWith('evt1');
    });

    await waitFor(() => {
      expect(mocks.deleteCalendarEvent).toHaveBeenCalledWith('evt1');
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Reunión general' })).not.toBeInTheDocument();
    });
  });
});
