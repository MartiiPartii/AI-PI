import type { ApiResponse } from '@/schemas/api';
import { loginAction, signupAction } from '@/actions/auth';

/**
 * Thin client-side wrappers over the auth Server Actions. Components/hooks call
 * these; they add no logic beyond forwarding. On success the Server Action
 * redirects, so a resolved value here always represents a failure to surface.
 */

export function submitLogin(input: {
  phone: string;
  password: string;
}): Promise<ApiResponse<null>> {
  return loginAction(input);
}

export function submitSignup(input: {
  phone: string;
  password: string;
}): Promise<ApiResponse<null>> {
  return signupAction(input);
}
