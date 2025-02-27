import { component$ } from "@builder.io/qwik";
import { Form, routeAction$, z, zod$, type DocumentHead } from "@builder.io/qwik-city";

export const useLogin = routeAction$(async (data, event) => {
  //TODO: Call real login api
  if (data.username === "admin@test.com" && data.password === "1234") {
    event.cookie.set("username", data.username, { httpOnly: true, path: "/", secure: true, maxAge: 60 * 60 });
    return {
      success: true
    };
  }
  return event.fail(401, {
    message: "Unauthorized",
  })
}, zod$({
  username: z.string().email(),
  password: z.string(),
}));

export default component$(() => {
  const loginAction = useLogin();

  return (
    <div class="h-screen flex flex-col place-content-center">

      {loginAction.value?.failed && loginAction.value.message && <div class="self-center flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
        <svg class="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <span class="sr-only">Info</span>
        <div>
          {loginAction.value.message}
        </div>
      </div>
      }

      <Form class="max-w-sm mx-auto" action={loginAction} onSubmitCompleted$={() => {
        if (loginAction.value?.success) {
          window.location.href = "/";
        }
      }}>
        <div class="mb-5">
          {loginAction.value?.fieldErrors?.username && <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
            {loginAction.value.fieldErrors.username}
          </div>
          }
          <label for="username" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Usuario</label>
          <input type="username" name="username" id="username" class="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light" placeholder="example@test.com" required />
        </div>
        <div class="mb-5">
          {loginAction.value?.fieldErrors?.password && <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
            {loginAction.value.fieldErrors.password}
          </div>
          }
          <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Contraseña</label>
          <input type="password" name="password" id="password" class="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light" placeholder="*********" required />
        </div>
        <button type="submit" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Ingresar</button>
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Login",
  meta: [
    {
      name: "description",
      content: "Login",
    },
  ],
};
