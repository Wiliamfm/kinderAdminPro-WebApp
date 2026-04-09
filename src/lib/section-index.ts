import type { ProtectedModule } from './pocketbase/auth';

export type SectionLink = {
  label: string;
  href: string;
  requiredModules?: ProtectedModule[];
};

export type SectionIndexEntry = {
  title: string;
  description: string;
  links: SectionLink[];
};

export const professorSectionIndexByPage: Record<string, SectionIndexEntry> = {
  'professor-personal': {
    title: 'Gestión de pagos e incapacidades',
    description: 'Accede a tus opciones personales: registra ausencias y consulta tus pagos.',
    links: [
      {
        label: 'Registrar ausencia',
        href: '/professor/personal/leaves',
        requiredModules: ['professor-personal'],
      },
      {
        label: 'Consultar pagos',
        href: '/professor/personal/invoices',
        requiredModules: ['professor-personal'],
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
  'professor-students': {
    title: 'Gestión de Estudiantes',
    description: 'Consulta el listado de estudiantes asignados a tus grados.',
    links: [{ label: 'Volver al inicio', href: '/' }],
  },
  'professor-events': {
    title: 'Eventos',
    description: 'Consulta el calendario de eventos de la institución.',
    links: [{ label: 'Volver al inicio', href: '/' }],
  },
};

export const sectionIndexByPage: Record<string, SectionIndexEntry> = {
  staff: {
    title: 'Gestión de personal',
    description:
      'En esta sección podrás acceder a las funciones principales para administrar el personal de la institución.',
    links: [
      { label: 'Gestion de personal', href: '/staff-management/employees', requiredModules: ['staff'] },
      {
        label: 'Gestion de cargos',
        href: '/staff-management/jobs',
        requiredModules: ['staff'],
      },
      {
        label: 'Gestion de usuarios',
        href: '/staff-management/app-users',
        requiredModules: ['users'],
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
  enrollment: {
    title: 'Gestión de matrícula',
    description:
      'En esta sección podrás gestionar las tareas generales relacionadas con el proceso de matrícula.',
    links: [
      {
        label: 'Gestion de Estudiantes',
        href: '/enrollment-management/students',
        requiredModules: ['enrollment'],
      },
      {
        label: 'Gestion de Tutores',
        href: '/enrollment-management/tutors',
        requiredModules: ['enrollment'],
      },
      {
        label: 'Gestion de Solicitudes',
        href: '/enrollment-management/requests',
      },
      {
        label: 'Gestion de Grados',
        href: '/enrollment-management/grades',
        requiredModules: ['enrollment'],
      },
      {
        label: 'Gestion de trimestres',
        href: '/enrollment-management/semesters',
        requiredModules: ['enrollment'],
      },
      {
        label: 'Gestion de boletines',
        href: '/enrollment-management/bulletins',
        requiredModules: ['enrollment'],
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
  events: {
    title: 'Gestión de eventos',
    description:
      'En esta sección encontrarás el acceso a las opciones para organizar y consultar eventos escolares.',
    links: [
      {
        label: 'Calendario',
        href: '/event-management/calendar',
        requiredModules: ['events'],
      },
      {
        label: 'Correos',
        href: '/event-management/email',
        requiredModules: ['events'],
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
  reports: {
    title: 'Informes',
    description:
      'En esta sección podrás revisar y navegar por los informes administrativos disponibles.',
    links: [
      {
        label: 'Estudiantes',
        href: '/reports/students',
        requiredModules: ['reports'],
      },
      {
        label: 'Empleados',
        href: '/reports/employees',
        requiredModules: ['reports'],
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
};
