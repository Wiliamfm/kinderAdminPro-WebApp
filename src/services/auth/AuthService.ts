import { $ } from "@builder.io/qwik";
import { AuthRepository } from "~/infrastructure/persistence/repositories/auth.repository";
import { LoginRequest, LoginResponse } from "~/models/auth.types";
import { BaseResponse } from "~/models/common/baseResponse.type";

const authRepository = new AuthRepository();

export const isAuthenticated = $(async (user_id: string) => {
  const token = await authRepository.getJWT(user_id);
  return token !== null;
});

export const login = $((req: LoginRequest): BaseResponse<LoginResponse> => {
  if (req.username !== "admin" || req.password !== "admin") {
    return {
      success: false,
      code: 401,
      errorMessage: "Invalid username or password",
    };
  }

  let response: BaseResponse<LoginResponse> = {
    success: true,
    code: 200,
  };
  let loginResponse: LoginResponse = {
    username: req.username,
    token: "token",
  };
  authRepository.saveJWT(req.username, loginResponse.token);
  response.value = loginResponse;
  return response;
});
