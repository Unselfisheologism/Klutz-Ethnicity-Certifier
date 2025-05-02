// src/ai/flows/analyze-text-ethics.ts
'use server';

/**
 * @fileOverview A text ethics analysis AI agent.
 *
 * - analyzeTextEthics - A function that handles the text ethics analysis process.
 * - AnalyzeTextEthicsInput - The input type for the analyzeTextEthics function.
 * - AnalyzeTextEthicsOutput - The return type for the analyzeTextEthics function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeTextEthicsInputSchema = z.object({
  textDataUri: z
    .string()
    .describe(
      'The text content of the document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Assuming data URI format for file content
    ),
});
export type AnalyzeTextEthicsInput = z.infer<typeof AnalyzeTextEthicsInputSchema>;

const AnalyzeTextEthicsOutputSchema = z.object({
  ethicalAnalysis: z.object({
    hasEthicalConcerns: z.boolean().describe('Whether the text contains potentially unethical statements.'),
    ethicalViolations: z
      .array(z.string())
      .describe('Specific types of ethical violations detected in the text.'),
    summary: z.string().describe('A summary of the ethical concerns found in the text.'),
  }),
});
export type AnalyzeTextEthicsOutput = z.infer<typeof AnalyzeTextEthicsOutputSchema>;

export async function analyzeTextEthics(input: AnalyzeTextEthicsInput): Promise<AnalyzeTextEthicsOutput> {
  return analyzeTextEthicsFlow(input);
}

const analyzeTextEthicsPrompt = ai.definePrompt({
  name: 'analyzeTextEthicsPrompt',
  input: {
    schema: z.object({
      textDataUri: z
        .string()
        .describe(
          'The text content of the document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Assuming data URI format for file content
        ),
    }),
  },
  output: {
    schema: z.object({
      ethicalAnalysis: z.object({
        hasEthicalConcerns: z.boolean().describe('Whether the text contains potentially unethical statements.'),
        ethicalViolations: z
          .array(z.string())
          .describe('Specific types of ethical violations detected in the text.'),
        summary: z.string().describe('A summary of the ethical concerns found in the text.'),
      }),
    }),
  },
  prompt: `You are an AI ethics analyst. Analyze the following text for potentially unethical statements.

Text: {{textDataUri}}

Identify specific types of ethical violations, such as hate speech, discrimination, or misinformation. Summarize the ethical concerns found in the text.`, // Access data URI as text
  model: 'googleai/gemini-2.0-pro',
});

const analyzeTextEthicsFlow = ai.defineFlow<typeof AnalyzeTextEthicsInputSchema, typeof AnalyzeTextEthicsOutputSchema>(
  {
    name: 'analyzeTextEthicsFlow',
    inputSchema: AnalyzeTextEthicsInputSchema,
    outputSchema: AnalyzeTextEthicsOutputSchema,
  },
  async input => {
    const {output} = await analyzeTextEthicsPrompt(input);
    return output!;
  }
);
