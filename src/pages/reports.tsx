import SectionIndexCard from '../components/SectionIndexCard';
import { sectionIndexByPage } from '../lib/section-index';

export default function ReportsPage() {
  const section = sectionIndexByPage.reports;

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-8">
      <SectionIndexCard
        title={section.title}
        description={section.description}
        links={section.links}
      />
    </section>
  );
}
