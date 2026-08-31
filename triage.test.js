import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { SupportTicketOutputSchema } from './schema.js';

describe('POST /api/triage - Reliable LLM Judgment Suite', () => {

  // Test 1: Critical Billing Issue
  it('1. Correctly classifies and extracts high-urgency billing problems', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'I was double charged $120 on invoice #9021 yesterday! Refund me immediately!' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('billing');
    expect(['high', 'critical']).toContain(res.body.data.urgency);
    expect(res.body.data.sentiment).toBe('negative');
    expect(() => SupportTicketOutputSchema.parse(res.body.data)).not.toThrow();
  }, 20000);

  // Test 2: Low-Urgency Account Inquiry
  it('2. Correctly flags non-urgent account management requests', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Hi, could someone tell me how I can update my account email address whenever you get a chance?' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('account');
    expect(res.body.data.urgency).toBe('low');
  }, 20000);

  // Test 3: Technical Outage / Critical Bug
  it('3. Identifies technical bugs and assigns appropriate urgency', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Production server is throwing 500 Internal Server Errors on the checkout endpoint.' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('technical');
    expect(['high', 'critical']).toContain(res.body.data.urgency);
  }, 20000);

  // Test 4: General Positive Feedback
  it('4. Classifies positive general feedback with low urgency', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Just wanted to say the new UI update is wonderful. Kudos to the team!' });

    expect(res.status).toBe(200);
    expect(res.body.data.sentiment).toBe('positive');
    expect(res.body.data.urgency).toBe('low');
  }, 20000);

  // Test 5: Schema Strictness & Output Key Guarantee
  it('5. Ensures schema guarantees presence of all mandatory fields and bounds', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Can you send me a link to your API documentation?' });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.confidence_score).toBe('number');
    expect(res.body.data.confidence_score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.confidence_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(res.body.data.key_entities)).toBe(true);
  }, 20000);

  // Test 6: Input Validation Rejection (Bad Request)
  it('6. Returns 400 Bad Request on empty or missing body parameters', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request payload');
  }, 5000);

  // Test 7: Input Boundary Rejection (String too short)
  it('7. Returns 400 Bad Request when message text is below character threshold', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body.details[0].message).toContain('at least 5 characters');
  }, 5000);

  // Test 8: Ambiguous Edge Cases Still Adhere to Enum Constraints
  it('8. Confines ambiguous input strictly to valid enums without producing nulls', async () => {
    const res = await request(app)
      .post('/api/triage')
      .send({ text: 'Maybe something is wrong, maybe not. Just checking.' });

    expect(res.status).toBe(200);
    expect(['billing', 'technical', 'account', 'general_inquiry']).toContain(res.body.data.category);
    expect(['low', 'medium', 'high', 'critical']).toContain(res.body.data.urgency);
  }, 20000);
});