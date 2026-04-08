import { createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import SectionIndexCard from '../../components/SectionIndexCard';
import { professorSectionIndexByPage } from '../../lib/section-index';
import { canAccessModule, canAccessModules } from '../../lib/pocketbase/auth';

export default function ProfessorManagementPage() {
  const navigate = useNavigate();
  const section = professorSectionIndexByPage['professor-personal'];
  const links = section.links.filter((link) => canAccessModules(link.requiredModules ?? []));

  createEffect(() => {
    if (!canAccessModule('professor-personal')) {
      navigate('/', { replace: true });
    }
  });

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-8">
      <SectionIndexCard
        title={section.title}
        description={section.description}
        links={links}
      />
    </section>
  );
}
