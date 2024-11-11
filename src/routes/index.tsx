import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import LogoImg from "../../public/images/logo.jpeg?jsx";

export default component$(() => {
  return <>
    <div class="h-max flex flex-col mt-5 mx-5 items-center">
      <h1 class="text-3xl font-sans">Bienvenido - KinderAdminPro</h1>
      <div class="mt-28 h-full w-min flex flex-col">
        <div class="w-60 border-2 border-b-0 rounded-t-lg">
          <LogoImg
            alt="logo"
          />
        </div>
        <div class="p-5 border-2 border-t-0 rounded-b-lg">
          <h2 class="text-center">Modulos</h2>
          <p class="">Por favor seleccione uno de los modulos.</p>
          <ul class="">
            <li class=""><Link href="./payroll">Nómina</Link></li>
            <li class=""><Link href="">Matrícula</Link></li>
            <li class="">
              <Link href="">Gestión de eventos</Link>
            </li>
            <li class="">
              <Link href="">Gestión de informes</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </>;
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
