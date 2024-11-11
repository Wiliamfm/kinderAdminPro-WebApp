import { z } from "@builder.io/qwik-city";
import { NonEmptyOrWhitSpaceStringModel } from "./common/string.schema";

export const LoginRequestModel = z.object({
  username: NonEmptyOrWhitSpaceStringModel,
  password: NonEmptyOrWhitSpaceStringModel,
});

export const LoginResponseModel = z.object({
  username: NonEmptyOrWhitSpaceStringModel,
  token: NonEmptyOrWhitSpaceStringModel,
});
