import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import LogoImg from "../../../public/images/logo.jpeg?jsx";

export default component$(() => {
  return <>
    <div class="h-max flex flex-col mt-5 mx-5 items-center">
      <h1 class="text-3xl font-sans">Bienvenido - Nómina</h1>
      <div class="mt-28 h-full w-min flex flex-col">
        <div class="w-60 border-2 border-b-0 rounded-t-lg">
          <LogoImg
            alt="logo"
          />
        </div>
        <div class="p-5 border-2 border-t-0 rounded-b-lg">
          <h2 class="text-center">Modulos</h2>
          <p class="">Por favor seleccione una de las siguientes opciones.</p>
          <ul class="">
            <li class=""><Link href="">Pagos</Link></li>
            <li class=""><Link href="">Incapacidades y Licencias</Link></li>
            <li class="">
              <Link href="./employee">Gestión de empleados</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </>;
});
