import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listEmailMessageRecipients,
  listEmailMessages,
  resolveEmployeeRecipients,
  resolveFatherRecipients,
  sendEventEmail,
} from './event-email-messaging';

const hoisted = vi.hoisted(() => {
  const studentsFathersGetFullList = vi.fn();
  const emailMessagesGetList = vi.fn();
  const emailRecipientsGetFullList = vi.fn();
  const sendBulkEmail = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const listActiveEmployees = vi.fn();
  const listActiveStudents = vi.fn();
  const listGrades = vi.fn();
  const getAuthenticatedPb = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'students_fathers') {
        return {
          getFullList: studentsFathersGetFullList,
        };
      }

      if (name === 'email_messages') {
        return {
          getList: emailMessagesGetList,
        };
      }

      if (name === 'email_message_recipients') {
        return {
          getFullList: emailRecipientsGetFullList,
        };
      }

      return {
        getFullList: vi.fn(),
        getList: vi.fn(),
      };
    }),
  };

  return {
    studentsFathersGetFullList,
    emailMessagesGetList,
    emailRecipientsGetFullList,
    sendBulkEmail,
    normalizePocketBaseError,
    listActiveEmployees,
    listActiveStudents,
    listGrades,
    getAuthenticatedPb,
    pb,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPb: hoisted.getAuthenticatedPb,
}));

vi.mock('./errors', () => ({
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./employees', () => ({
  listActiveEmployees: hoisted.listActiveEmployees,
}));

vi.mock('./students', () => ({
  listActiveStudents: hoisted.listActiveStudents,
}));

vi.mock('./grades', () => ({
  listGrades: hoisted.listGrades,
}));

vi.mock('../server/email', () => ({
  sendBulkEmail: hoisted.sendBulkEmail,
}));

describe('event-email-messaging pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
  });

  it('resolves active employee recipients from selected ids', async () => {
    hoisted.listActiveEmployees.mockResolvedValue([
      {
        id: 'emp1',
        name: 'Ana Gomez',
        email: 'ana@example.com',
      },
      {
        id: 'emp2',
        name: 'Luis Perez',
        email: '',
      },
    ]);

    const result = await resolveEmployeeRecipients(['emp2', 'emp1', 'emp1']);

    expect(result).toEqual([
      {
        key: 'employee:emp1',
        recipientType: 'employee',
        recipientId: 'emp1',
        recipientName: 'Ana Gomez',
        recipientEmail: 'ana@example.com',
        hasEmail: true,
        sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
      },
      {
        key: 'employee:emp2',
        recipientType: 'employee',
        recipientId: 'emp2',
        recipientName: 'Luis Perez',
        recipientEmail: '',
        hasEmail: false,
        sources: [{ kind: 'employee', id: 'emp2', label: 'Luis Perez' }],
      },
    ]);
  });

  it('resolves and de-duplicates father recipients across students and grades', async () => {
    hoisted.listActiveStudents.mockResolvedValue([
      {
        id: 'stu1',
        name: 'Maria',
        grade_id: 'grade1',
        grade_name: 'Primero',
      },
      {
        id: 'stu2',
        name: 'Jose',
        grade_id: 'grade1',
        grade_name: 'Primero',
      },
    ]);
    hoisted.listGrades.mockResolvedValue([
      { id: 'grade1', name: 'Primero' },
    ]);
    hoisted.studentsFathersGetFullList.mockResolvedValue([
      {
        id: 'link1',
        student_id: 'stu1',
        father_id: 'fat1',
        expand: {
          father_id: {
            full_name: 'Laura Tutor',
            email: 'laura@example.com',
            is_active: true,
          },
        },
      },
      {
        id: 'link2',
        student_id: 'stu2',
        father_id: 'fat1',
        expand: {
          father_id: {
            full_name: 'Laura Tutor',
            email: 'laura@example.com',
            is_active: true,
          },
        },
      },
    ]);

    const result = await resolveFatherRecipients({
      studentIds: ['stu1'],
      gradeIds: ['grade1'],
    });

    expect(hoisted.studentsFathersGetFullList).toHaveBeenCalledWith({
      filter: 'student_id = "stu1" || student_id = "stu2"',
      expand: 'father_id',
      sort: 'created_at,id',
      fields: 'id,student_id,father_id,expand.father_id.full_name,expand.father_id.email,expand.father_id.is_active',
      requestKey: 'event-email-fathers-stu1,stu2',
    });
    expect(result).toEqual([
      {
        key: 'father:fat1',
        recipientType: 'father',
        recipientId: 'fat1',
        recipientName: 'Laura Tutor',
        recipientEmail: 'laura@example.com',
        hasEmail: true,
        sources: [
          { kind: 'student', id: 'stu1', label: 'Maria' },
          { kind: 'grade', id: 'grade1', label: 'Primero' },
        ],
      },
    ]);
  });

  it('lists email message history', async () => {
    hoisted.emailMessagesGetList.mockResolvedValue({
      items: [
        {
          id: 'msg1',
          subject: 'Recordatorio',
          body_text: 'Texto',
          body_html: '<p>Texto</p>',
          created_by: 'u1',
          created_at: '2026-04-01 10:00:00.000Z',
          total_resolved: 3,
          total_sendable: 2,
          total_missing_email: 1,
          total_sent: 2,
          total_failed: 0,
          total_skipped: 1,
          expand: {
            created_by: {
              name: 'Admin',
            },
          },
        },
      ],
    });

    const result = await listEmailMessages();

    expect(hoisted.emailMessagesGetList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      expand: 'created_by',
    });
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'msg1',
      createdByName: 'Admin',
      createdAt: '2026-04-01T10:00:00.000Z',
      totalResolved: 3,
      totalSkipped: 1,
    }));
  });

  it('lists per-recipient history records and parses source context', async () => {
    hoisted.emailRecipientsGetFullList.mockResolvedValue([
      {
        id: 'rcp1',
        message_id: 'msg1',
        recipient_type: 'father',
        recipient_id: 'fat1',
        recipient_name: 'Laura Tutor',
        recipient_email: 'laura@example.com',
        source_kind: 'mixed',
        source_context: JSON.stringify([
          { kind: 'student', id: 'stu1', label: 'Maria' },
          { kind: 'grade', id: 'grade1', label: 'Primero' },
        ]),
        status: 'sent',
        provider_message_id: 'resend_1',
        error_message: '',
        created_at: '2026-04-01 10:05:00.000Z',
      },
    ]);

    const result = await listEmailMessageRecipients('msg1');

    expect(hoisted.emailRecipientsGetFullList).toHaveBeenCalledWith({
      filter: 'message_id = "msg1"',
      sort: 'created_at,id',
    });
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'rcp1',
      sourceKind: 'mixed',
      sources: [
        { kind: 'student', id: 'stu1', label: 'Maria' },
        { kind: 'grade', id: 'grade1', label: 'Primero' },
      ],
      status: 'sent',
      createdAt: '2026-04-01T10:05:00.000Z',
    }));
  });

  it('sends event emails through the server email workflow', async () => {
    hoisted.sendBulkEmail.mockResolvedValue({
      messageId: 'msg1',
      totalResolved: 2,
      totalSendable: 1,
      totalMissingEmail: 1,
      totalSent: 1,
      totalFailed: 0,
      totalSkipped: 0,
      recipients: [
        {
          recipientType: 'employee',
          recipientId: 'emp1',
          recipientName: 'Ana Gomez',
          recipientEmail: 'ana@example.com',
          status: 'sent',
          errorMessage: '',
          providerMessageId: 'res_1',
        },
      ],
    });

    const result = await sendEventEmail({
      subject: ' Recordatorio ',
      bodyText: 'Linea 1\n\nLinea 2',
      recipients: [
        {
          key: 'employee:emp1',
          recipientType: 'employee',
          recipientId: 'emp1',
          recipientName: 'Ana Gomez',
          recipientEmail: 'ana@example.com',
          hasEmail: true,
          sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
        },
      ],
    });

    expect(hoisted.sendBulkEmail).toHaveBeenCalledWith({
        subject: 'Recordatorio',
        bodyText: 'Linea 1\n\nLinea 2',
        recipients: [
          {
            recipientType: 'employee',
            recipientId: 'emp1',
            recipientName: 'Ana Gomez',
            recipientEmail: 'ana@example.com',
            sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
          },
        ],
    });
    expect(result).toEqual(expect.objectContaining({
      messageId: 'msg1',
      totalSent: 1,
    }));
  });

  it('normalizes errors from helper queries', async () => {
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.listActiveEmployees.mockRejectedValue(new Error('boom'));
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(resolveEmployeeRecipients(['emp1'])).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalled();
  });
});
