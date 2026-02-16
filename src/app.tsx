import { Suspense, type Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();

  return (
    <>
      <nav class="bg-white text-gray-900 px-4 border-b border-gray-200">
        <ul class="flex items-center">
          <li class="py-2 px-4">
            <A href="/" class="no-underline hover:underline">
              Home
            </A>
          </li>

          <li class="text-sm flex items-center space-x-2 ml-auto text-gray-600">
            <span>Path</span>
            <input
              class="w-32 p-1 bg-gray-50 text-sm rounded-lg border border-gray-200"
              type="text"
              readOnly
              value={location.pathname}
            />
          </li>
        </ul>
      </nav>

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;
