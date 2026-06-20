import { ErrorResponseSchema, type ApiResponse } from '@/schemas/api';
import z from 'zod';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type HttpOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

type HttpFunctionConfig<T> = {
    method: HttpMethod,
    path: string,
    options?: HttpOptions,
    schema?: z.ZodType<T>
}

/**
 * HTTP abstraction for API calls
 * Handles authentication, error parsing, and consistent response shape
 */
export async function http<T>({
  method,
  path,
  options,
  schema
}: HttpFunctionConfig<T>): Promise<ApiResponse<T>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Add auth token if available (from localStorage or cookie)
  if (typeof window !== 'undefined') {
    console.log("Only make backend API calls server side.")
    return {
        success: false,
        error: "Only make backend API calls server side."
    }
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (options?.body && method !== 'GET') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const status = response.status;

    // Parse JSON response
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      // If response is not JSON, treat as error
      return {
        success: false,
        error: 'Invalid response format',
      };
    }

    // Check if response is successful (2xx)
    if (status >= 200 && status < 300) {
        if(schema) {
            const parsedData = schema.safeParse(json)
            if(!parsedData.success) {
                return {
                    success: false,
                    error: "Invalid response format"
                }
            }
        }

        return {
            success: true,
            data: json as T,
        };
    }

    // Handle error response
    const parsedError = ErrorResponseSchema.safeParse(json)
    if(parsedError.success) {
        return {
            success: false,
            error: parsedError.data.error
        }
    }

    // Fallback for unexpected error format
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  } catch (error) {
    // Network errors or fetch failures
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
