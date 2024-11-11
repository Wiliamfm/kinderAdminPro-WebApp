import { z } from "@builder.io/qwik-city";

export const NonEmptyOrWhitSpaceStringModel = z
  .string()
  .min(1, "Value can not be empty")
  .trim();
