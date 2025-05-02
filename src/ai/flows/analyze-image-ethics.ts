'use server';

/**
 * @fileOverview Image ethics analyzer flow using GPT-4 Vision.
 *
 * - analyzeImageEthics - Analyzes an image for ethical violations.
 * - AnalyzeImageEthicsInput - Input type for analyzeImageEthics.
 * - AnalyzeImageEthicsOutput - Output type for analyzeImageEthics.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeImageEthicsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageEthicsInput = z.infer<typeof AnalyzeImageEthicsInputSchema>;

const AnalyzeImageEthicsOutputSchema = z.object({
  ethicalViolations: z
    .array(z.string())
    .describe('A list of potential ethical violations found in the image.'),
  isEthical: z.boolean().describe('Whether the image is ethical or not.'),
  reasoning: z.string().describe('The reasoning behind the ethical assessment.'),
});
export type AnalyzeImageEthicsOutput = z.infer<typeof AnalyzeImageEthicsOutputSchema>;

export async function analyzeImageEthics(input: AnalyzeImageEthicsInput): Promise<AnalyzeImageEthicsOutput> {
  return analyzeImageEthicsFlow(input);
}

const analyzeImageEthicsPrompt = ai.definePrompt({
  name: 'analyzeImageEthicsPrompt',
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
      ethicalViolations: z
        .array(z.string())
        .describe('A list of potential ethical violations found in the image.'),
      isEthical: z.boolean().describe('Whether the image is ethical or not.'),
      reasoning: z.string().describe('The reasoning behind the ethical assessment.'),
    }),
  },
  prompt: `Analyze the following image for potential ethical violations.  Identify specific types of violations present, and explain your reasoning.  Set isEthical to true if there are no violations.

Image: {{media url=photoDataUri}}
`,
});

const analyzeImageEthicsFlow = ai.defineFlow<
  typeof AnalyzeImageEthicsInputSchema,
  typeof AnalyzeImageEthicsOutputSchema
>(
  {
    name: 'analyzeImageEthicsFlow',
    inputSchema: AnalyzeImageEthicsInputSchema,
    outputSchema: AnalyzeImageEthicsOutputSchema,
  },
  async input => {
    const {output} = await analyzeImageEthicsPrompt(input);
    return output!;
  }
);
