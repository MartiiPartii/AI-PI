import z from "zod";

/**
 * Discriminated union for API responses
 * All API endpoints return either success with data or failure with error message
 */
export type ApiResponse<T> =
  | { success: true; data: T; }
  | { success: false; error: string; };


export const ErrorResponseSchema = z.object({
    error: z.string()
})

export type ErrorResponseType = z.infer<typeof ErrorResponseSchema>