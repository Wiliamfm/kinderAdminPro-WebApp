import SectionIndexCard from '../components/SectionIndexCard';
import { sectionIndexByPage } from '../lib/section-index';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';

export default function EnrollmentManagementPage() {
  const section = sectionIndexByPage.enrollment;
  const links = section.links.filter((link) => !link.requiresAdmin || isAuthUserAdmin());

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
