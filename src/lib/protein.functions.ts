import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  description: z.string().max(500).optional().default(""),
  image_data_url: z
    .string()
    .max(8_000_000)
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/)
    .optional(),
}).refine((v) => (v.description && v.description.trim().length > 0) || !!v.image_data_url, {
  message: "Provide a description or an image",
});

const ResponseSchema = z.object({
  items: z.array(
    z.object({
      food_name: z.string(),
      protein_g: z.number(),
    }),
  ),
  total_protein_g: z.number(),
});

export const estimateProtein = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userContent: Array<Record<string, unknown>> = [];
    const text = data.description?.trim()
      ? data.description.trim()
      : "Estimate the protein content of the food shown in this image.";
    userContent.push({ type: "text", text });
    if (data.image_data_url) {
      userContent.push({ type: "image_url", image_url: { url: data.image_data_url } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You estimate protein content of foods. Identify foods (from text and/or the image) and return a JSON object with `items` (each: food_name string, protein_g number) and total_protein_g (sum). Be realistic and concise. Use common food values.",
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_protein",
              description: "Report the estimated protein breakdown.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        food_name: { type: "string" },
                        protein_g: { type: "number" },
                      },
                      required: ["food_name", "protein_g"],
                    },
                  },
                  total_protein_g: { type: "number" },
                },
                required: ["items", "total_protein_g"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_protein" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit hit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI returned no estimate");
    const parsed = ResponseSchema.parse(JSON.parse(call.function.arguments));
    return parsed;
  });
