import { z } from "@builder.io/qwik-city";
import { LoginRequestModel, LoginResponseModel } from "./auth.schema";

export type LoginRequest = z.infer<typeof LoginRequestModel>;
export type LoginResponse = z.infer<typeof LoginResponseModel>;
