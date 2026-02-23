export type SectionLink = {
  label: string;
  href: string;
  requiresAdmin?: boolean;
};

export type SectionIndexEntry = {
  title: string;
  description: string;
  links: SectionLink[];
};

export const sectionIndexByPage: Record<string, SectionIndexEntry> = {
  staff: {
    title: 'Gestión de personal',
    description:
      'En esta sección podrás acceder a las funciones principales para administrar el personal de la institución.',
    links: [
      { label: 'Gestion de personal', href: '/staff-management/employees' },
      {
        label: 'Gestion de usuarios',
        href: '/staff-management/app-users',
        requiresAdmin: true,
      },
      { label: 'Volver al inicio', href: '/' },
    ],
  },
  enrollment: {
    title: 'Gestión de matrícula',
    description:
      'En esta sección podrás gestionar las tareas generales relacionadas con el proceso de matrícula.',
    links: [{ label: 'Volver al inicio', href: '/' }],
  },
  events: {
    title: 'Gestión de eventos',
    description:
      'En esta sección encontrarás el acceso a las opciones para organizar y consultar eventos escolares.',
    links: [{ label: 'Volver al inicio', href: '/' }],
  },
  reports: {
    title: 'Informes',
    description:
      'En esta sección podrás revisar y navegar por los informes administrativos disponibles.',
    links: [{ label: 'Volver al inicio', href: '/' }],
  },
};
