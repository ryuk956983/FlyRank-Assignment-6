import { z } from 'zod';

export const SupportTicketInputSchema = z.object({
  text: z.string().trim().min(5, 'Input text must be at least 5 characters long'),
});

export const SupportTicketOutputSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'general_inquiry']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  key_entities: z.array(z.string()).default([]),
  suggested_action: z.string().min(3),
  confidence_score: z.number().min(0).max(1),
});