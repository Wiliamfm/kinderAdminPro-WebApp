import { z } from "@builder.io/qwik-city";

export const BaseResponseModel = z.object({
  success: z.boolean(),
  code: z.number().min(100).max(599),
  value: z.any(),
  errorMessage: z.any(),
});

function createBaseResponseSchema<T>(value: T){
  return {
    success: z.boolean(),
    code: z.number().min(100).max(599),
    value: value,
  };
}
