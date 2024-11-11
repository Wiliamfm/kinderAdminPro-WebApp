import { z } from "@builder.io/qwik-city";
import { BaseResponseModel } from "./baseResponse.schema";

//export type BaseResponse<T> = z.infer<typeof BaseResponseModel<z.ZodType<T>>>;
export type BaseResponse<T> = z.infer<z.ZodType<typeof BaseResponseModel<T>>>;
