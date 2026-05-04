import { SetMetadata } from '@nestjs/common';

// Usage: @RateLimit('start')
export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (policyName: string) => SetMetadata(RATE_LIMIT_KEY, policyName);
