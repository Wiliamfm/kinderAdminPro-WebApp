import { component$, useStylesScoped$ } from '@builder.io/qwik';
import styles from './styles.css?inline';
import { Form, routeAction$, useNavigate, zod$ } from '@builder.io/qwik-city';
import Image from "../../../public/images/login.png?jsx";
import { LoginRequestModel } from '~/models/auth.schema';
import { login } from '../../services/auth/AuthService';
import { setSecureCookie } from '~/services/shared/cookieService';

export const useLogin = routeAction$(async (req, event) => {
  const response = await login(req);
  if(response.success){
    setSecureCookie(event.cookie, "user_id",  response.value.username);
    return response;
  }
  return event.fail(response.code, {message: response.errorMessage ?? "Usuario o contraseña incorrecta"})
}, zod$(LoginRequestModel))

export default component$(() => {
  useStylesScoped$(styles);

  const navigation = useNavigate();
  const loginAction = useLogin();

  loginAction.value?.failed && alert(loginAction.value.message);

  return (
    <div class="container">
      <div class="login-container">
        <div class="form-container">
          <Image
            style={{ width: "100%", height: "auto" }}
            alt="illustration"
            class="illustration"
          />
          <h1 class="opacity">KinderAdminPro - Login</h1>
          <Form action={loginAction} onSubmitCompleted$={async (event) => {
            if(event.detail.value?.success && event.detail.value?.value) {
              //TODO: Check how to navigate to the index.
              //await navigation("/index");
              window.location.href = "/";
            }
          }}>
            <input name="username" type="text" placeholder="Usuario" />
            <input name="password" type="password" placeholder="Contraseña" />
            <button type="submit" class="opacity">Ingresar</button>
          </Form>
          <div class="register-forget opacity">
          {
            /*
              <a href="">REGISTER</a>
              <a href="">FORGOT PASSWORD</a>
            */
          }
          </div>
        </div>
      </div>
    </div>
  );
});
