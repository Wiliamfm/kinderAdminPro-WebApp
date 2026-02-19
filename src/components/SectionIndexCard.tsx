import { A } from '@solidjs/router';
import { For, type Component } from 'solid-js';

type SectionLink = {
  label: string;
  href: string;
};

type SectionIndexCardProps = {
  title: string;
  description: string;
  links: SectionLink[];
};

const SectionIndexCard: Component<SectionIndexCardProps> = (props) => {
  return (
    <div class="mx-auto max-w-3xl rounded-xl border border-yellow-300 bg-white p-6">
      <h1 class="text-2xl font-semibold">{props.title}</h1>
      <p class="mt-2 text-gray-600">{props.description}</p>

      <div class="mt-6 border-t border-yellow-200 pt-4">
        <h2 class="text-sm font-medium uppercase tracking-wide text-gray-700">Páginas relacionadas</h2>

        <ul class="mt-3 space-y-2">
          <For each={props.links}>
            {(link) => (
              <li>
                <A
                  href={link.href}
                  class="inline-flex rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
                >
                  {link.label}
                </A>
              </li>
            )}
          </For>
        </ul>

        {props.links.length === 0 && (
          <p class="text-sm text-gray-500">Sin enlaces relacionados por ahora.</p>
        )}
      </div>
    </div>
  );
};

export default SectionIndexCard;
