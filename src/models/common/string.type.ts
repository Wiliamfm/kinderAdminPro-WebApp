import { z } from "@builder.io/qwik-city";
import { NonEmptyOrWhitSpaceStringModel } from "./string.schema";

export type NonEmptyOrWhitSpaceString = z.infer<typeof NonEmptyOrWhitSpaceStringModel>;
