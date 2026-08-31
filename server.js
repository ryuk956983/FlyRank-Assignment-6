import 'dotenv/config';
import express from 'express';
import { SupportTicketInputSchema } from './schema.js';
import { triageCustomerMessage } from './llmService.js';

export const app = express();
app.use(express.json());

app.post('/api/triage', async (req, res) => {
  // 1. Input validation
  const inputValidation = SupportTicketInputSchema.safeParse(req.body);
  if (!inputValidation.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: inputValidation.error.issues,
    });
  }

  // 2. LLM execution
  try {
    const result = await triageCustomerMessage(inputValidation.data.text);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`[API /api/triage Error]:`, error.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to obtain a verified model judgment',
      message: error.message,
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Reliable API running on http://localhost:${PORT}`));
}