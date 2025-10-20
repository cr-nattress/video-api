# OpenAI Node.js SDK — Practical Guide (LLM‑Optimized)

## TL;DR

- **SDK**: Official TypeScript client for OpenAI APIs.
- **Use first**: `Responses API` for most text tasks; `Chat Completions` only if you rely on legacy patterns.
- **Node**: v18+ (native fetch). Works in Edge runtimes (CF Workers, Vercel Edge), Deno, Bun.
- **Install**: `npm i openai`

## Quickstart

```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const res = await client.responses.create({
  model: 'gpt-4o',
  input: 'Hello! Summarize the OpenAI Node SDK in one sentence.',
});

console.log(res.output_text);
```

## Install

```bash
npm i openai
# pnpm add openai | yarn add openai | bun add openai
```

## Auth & Configuration

- **Env vars**
  - `OPENAI_API_KEY` (required)
  - `OPENAI_ORGANIZATION` (optional)
  - `OPENAI_PROJECT` (optional)
- **Client options**
  - `timeout`, `maxRetries`, `baseURL`, `fetch`, `fetchOptions`, `logger`, `logLevel`, `webhookSecret`

```ts
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20_000,
  maxRetries: 1,
  // baseURL: 'https://api.openai.com/v1/',
  // fetch: customFetch,
  // fetchOptions: { /* RequestInit */ },
  // logger: myLogger,
  // logLevel: 'warn',
  // webhookSecret: process.env.OPENAI_WEBHOOK_SECRET,
});
```

References: [API Keys](https://platform.openai.com/account/api-keys), [SDK README](https://github.com/openai/openai-node), [API Reference](https://platform.openai.com/docs/api-reference)

## Text Generation — Responses API (Recommended)

```ts
const result = await client.responses.create({
  model: 'gpt-4o',
  instructions: 'You are a concise assistant.',
  input: 'Explain JSON mode in one sentence.',
  temperature: 0.7,
});
console.log(result.output_text);
```

### Streaming

```ts
const stream = await client.responses.create({
  model: 'gpt-4o',
  input: 'Stream a haiku about TypeScript.',
  stream: true,
});

for await (const event of stream) {
  process.stdout.write(event.delta ?? event.output_text ?? '');
}
```

### JSON Mode (Structured Output)

```ts
const jsonRes = await client.responses.create({
  model: 'gpt-4o',
  response_format: 'json',
  instructions: 'Return an object with keys title and tags (array of strings).',
  input: 'Title: SDK Guide; Tags: node, openai, docs',
});
console.log(jsonRes.output_text); // JSON string
```

## Chat Completions (Legacy)

Use if you already manage chat histories manually.

```ts
const chat = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Are semicolons optional in JS?' },
  ],
});
console.log(chat.choices[0].message?.content);
```

## Function Calling (Chat API)

```ts
const functions = [{
  name: 'getCurrentWeather',
  description: 'Get current weather for a city',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
}];

const completion = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Weather in Paris?' }],
  functions,
  function_call: 'auto',
});

const msg = completion.choices[0].message;
if (msg?.function_call?.name === 'getCurrentWeather') {
  const args = JSON.parse(msg.function_call.arguments ?? '{}');
  const weather = await myWeatherAPI(args.city);
  const followUp = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Weather in Paris?' },
      { role: 'function', name: 'getCurrentWeather', content: JSON.stringify(weather) },
    ],
  });
  console.log(followUp.choices[0].message?.content);
}
```

## Structured Output with Zod Helper

```ts
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const Person = z.object({ name: z.string(), age: z.number() });
const format = zodTextFormat(Person);

const res2 = await client.responses.create({
  model: 'gpt-4o',
  instructions: format.system,
  input: 'Provide a person object as JSON.',
});

const parsed = format.parse(res2.output_text);
```

Docs: [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

## Images (DALL·E)

```ts
const img = await client.images.generate({
  prompt: 'A steampunk airship above clouds',
  n: 1,
  size: '512x512',
});
console.log(img.data[0].url);
```

Edits/variations require image/mask files. See: [Images API](https://platform.openai.com/docs/api-reference/images)

## Audio

### Speech‑to‑Text (Whisper)

```ts
import fs from 'node:fs';
const file = fs.createReadStream('speech.mp3');
const transcript = await client.audio.transcriptions.create({
  file,
  model: 'whisper-1',
  response_format: 'text',
});
console.log(transcript.text);
```

Docs: [Audio](https://platform.openai.com/docs/api-reference/audio)

## Files

```ts
import { toFile } from 'openai';

const data = Buffer.from('line1\nline2');
await client.files.create({
  file: await toFile(data, 'train.jsonl'),
  purpose: 'fine-tune',
});

for await (const f of client.files.list()) {
  console.log(f.id, f.filename);
}
```

Docs: [Files](https://platform.openai.com/docs/api-reference/files)

## Fine‑tuning

```ts
const job = await client.fineTuning.jobs.create({
  training_file: 'file_123',
  model: 'gpt-3.5-turbo',
});
console.log(job.id, job.status);
```

Docs: [Fine‑tuning](https://platform.openai.com/docs/guides/fine-tuning)

## Embeddings

```ts
const emb = await client.embeddings.create({
  model: 'text-embedding-3-large',
  input: ['OpenAI is great', 'Vectorize me'],
});
console.log(emb.data[0].embedding.length);
```

Docs: [Embeddings](https://platform.openai.com/docs/api-reference/embeddings)

## Moderations

```ts
const mod = await client.moderations.create({
  input: 'I want to hurt them.',
});
console.log(mod.results[0].flagged);
```

Docs: [Moderations](https://platform.openai.com/docs/api-reference/moderations)

## Batch (Async)

Use for large offline jobs (e.g., many embeddings). Prepare JSONL of requests, upload, then create batch.

Docs: [Batch](https://platform.openai.com/docs/api-reference/batch)

## Best Practices

- **Keys**: Never expose API keys to browsers. Use server/edge functions.
- **Retries**: Keep `maxRetries` small; handle 429 with backoff.
- **Timeouts**: Set per‑request for long operations.
- **Chunking**: Split long docs for embeddings (e.g., ~500 tokens).
- **Streaming**: Prefer for chat UX; flush tokens as they arrive.
- **JSON Mode**: Use when you need strict structure; validate with Zod.
- **Edge**: Avoid Node‑only APIs (fs) in edge runtimes; use fetch/File.

## Troubleshooting

- **401 Unauthorized**: Check `OPENAI_API_KEY`, project/org headers.
- **429 Rate limited**: Reduce QPS, add jitter, leverage Batch for bulk.
- **400 Bad Request**: Verify model name and parameter shapes.
- **Timeouts**: Increase `timeout`, confirm network/proxy.
- **Streaming stalls**: Ensure environment supports SSE/iterables.

---

Resources: [SDK Repo](https://github.com/openai/openai-node) · [API Reference](https://platform.openai.com/docs/api-reference) · [Guides](https://platform.openai.com/docs/guides)
. Never hard-code API keys in client-side code; load them from secure server env variables or secret management in production. Security best-practice: treat your OpenAI API key like a password. Do not expose it publicly, and rotate it if compromised. Use server-side calls or Edge functions to keep the key hidden, rather than calling the OpenAI API directly from a public frontend.
Install & Configure
To install the OpenAI SDK in a Node.js project, use your package manager:
npm install openai   # or: pnpm add openai / bun add openai / yarn add openai
This provides the openai package for import
github.com
. Ensure you are using Node 18 or newer (for native fetch support). If using TypeScript, types are included. No separate @types package is needed. ESM vs CJS: The SDK is published as an ES module. In Node, import via import OpenAI from 'openai'; (or dynamic await import('openai')). For CommonJS, you can require the package – Node will interoperate – but append .default to get the class. For example:
// CommonJS usage
const { default: OpenAI } = require('openai');
const client = new OpenAI();
Environment Variables:
OPENAI_API_KEY – Required. Your secret API key for authentication (prefix sk-...), obtainable from the OpenAI dashboard. If this is set, you can call new OpenAI() without passing apiKey explicitly
github.com
.
OPENAI_ORGANIZATION – Optional. Org ID if you belong to multiple orgs (format org-...). If set, the SDK will include it in an OpenAI-Organization header so the request counts against that org
github.com
.
OPENAI_PROJECT – Optional. Project ID for usage tracking, sent as OpenAI-Project header
github.com
. (This is used with the newer Assistants/Agents platform; if unsure, omit it.)
OPENAI_WEBHOOK_SECRET – Optional. If using webhooks (for certain asynchronous endpoints like batch jobs or fine-tuning events), set this to verify signatures (see Webhooks section).
Set these variables in your environment (e.g. in a .env file or host secret config). Do not commit them to source control. When deploying (to AWS, Vercel, etc.), use the platform’s secret storage. Client Configuration: Besides the API key, the OpenAI constructor accepts a configuration object for timeouts, base URLs, and more:
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,     // or omit if using env
  organization: 'org123...',             // optional org
  timeout: 20_000,                       // 20 seconds timeout (default is 600_000 ms):contentReference[oaicite:13]{index=13}
  maxRetries: 1,                         // override retry attempts (default 2):contentReference[oaicite:14]{index=14}
  baseURL: 'https://api.openai.com/v1/', // override API base if needed
  fetch: customFetchFunction,            // provide a custom fetch implementation if needed
  fetchOptions: { /* RequestInit opts like agent, etc. */ },
  logger: customLogger,                 // custom logger (pino, winston, etc.)
  logLevel: 'warn',                     // logging verbosity (default 'warn'):contentReference[oaicite:15]{index=15}
  webhookSecret: process.env.OPENAI_WEBHOOK_SECRET // if verifying webhooks
});
Timeouts: By default, requests time out after 10 minutes (600,000 ms)
github.com
. You can adjust this globally via the timeout option, or per-request by passing { timeout: ... } in the method call options
github.com
. On a timeout, the SDK throws an APIConnectionTimeoutError
github.com
.
Retries: The SDK automatically retries certain errors (network errors, HTTP 408, 409, 429, and >=500 server errors) up to 2 times with exponential backoff by default
github.com
. You can configure maxRetries (global or per-request) to alter this
github.com
. Set maxRetries: 0 to disable auto-retry entirely
github.com
. Retries respect a short backoff and are applied even to timeouts by default
github.com
.
Base URL & Proxies: By default, the SDK calls https://api.openai.com. To use Azure OpenAI, you’ll use a different class (see Azure section below). For other proxy or test scenarios, you can override baseURL. To route through a proxy, you can supply a custom fetch or use fetchOptions. In Node, for example, using Undici’s ProxyAgent:
import * as undici from 'undici';
const proxyAgent = new undici.ProxyAgent('http://localhost:8888');
const client = new OpenAI({
  fetchOptions: { dispatcher: proxyAgent }
});
In Bun, a simpler fetchOptions: { proxy: 'http://localhost:8888' } is supported
github.com
. In Deno, you can pass a custom HTTP client to fetchOptions
github.com
. The SDK is flexible to run in any runtime with a WHATWG Fetch API.
Logging: By default, the library logs to the console at level 'warn' (warnings and errors only)
github.com
. Set the OPENAI_LOG env var or logLevel option to debug for full request/response logging (note: bodies are logged and may contain sensitive data)
github.com
. For production, 'warn' or 'error' is recommended. You can inject a custom logger via the logger option (e.g. a child logger from pino, Winston, etc.)
github.com
github.com
. The logLevel still controls which messages are emitted to your logger.
Supported Runtimes: This SDK works in Node.js (>=18.x) and any runtime with a standard fetch API. It can run in serverless and edge environments like Cloudflare Workers or Vercel Edge Functions since it does not depend on Node-specific modules (it uses fetch, not direct http modules). When using in Edge or browsers, ensure you do not expose the API key – calls from edge should still treat the key as secret. Instead, deploy edge functions that perform requests on behalf of the client. The SDK’s file I/O helpers (like using fs.ReadStream) will only work in Node (not in Workers), but you can use in-memory File or Response objects in those environments as alternatives
github.com
github.com
.
Core API Surfaces & Usage Patterns
The OpenAI API has several resource surfaces. The Node SDK provides a structured client with properties for each surface (e.g. client.chat, client.images, client.audio, client.files, client.fineTuning, etc.). Each surface contains methods (typically .create, .list, .retrieve, etc.) corresponding to API endpoints. All methods return Promises, and many of the “list” methods return iterator objects to auto-paginate. Below we outline each major feature with examples.
Text Generation: Responses API (Assistants v2)
Purpose: High-level text generation interface supporting instructions + input style prompts, function/tool usage, and multi-turn assistant behavior. The Responses API is part of the new Assistants v2 platform, which abstracts conversation threads, so you don’t manually manage message history
help.openai.com
help.openai.com
. It’s the recommended way to get completions for both user queries and system-guided flows. Usage: Use client.responses.create(request) to generate a model response. Key parameters include the model (e.g. 'gpt-4o' or 'gpt-3.5-turbo' variants), and either:
instructions: A system-level directive or persona (e.g. "You are a helpful coding assistant."), analogous to a system message.
input: The user’s query or message.
The model will produce an output_text (and possibly structured data if tools are involved). Example:
const result = await client.responses.create({
  model: 'gpt-4o',
  instructions: 'You are a coding assistant that talks like a pirate.',
  input: 'Are semicolons optional in JavaScript?',
  temperature: 0.7,  // optional generation parameters
});
console.log(result.output_text);
// e.g., "Ahoy! In JavaScript, ye can omit semicolons, but it's best t' use 'em..."
In this example, instructions serves as the role/system prompt, and input as the user question
github.com
. The SDK sends these to the /v1/responses endpoint behind the scenes. The response object typically contains output_text (the assistant's reply) and metadata such as metrics (e.g. token usage) and possibly a thread or run ID if relevant. Streaming: You can receive the response incrementally by setting stream: true. The responses.create method will then return an async iterable (a stream of events). You can use a for await...of loop to handle each token or chunk as it arrives
github.com
github.com
:
const stream = await client.responses.create({
  model: 'gpt-4o',
  input: 'Say "Sheep sleep deep" ten times fast!',
  stream: true,
});
for await (const event of stream) {
  if (event === '[DONE]') break;        // stream terminator (if provided)
  process.stdout.write(event.delta ?? event.output_text ?? ''); 
}
Each event could be a partial message (for text delta) or an object. In simple cases, you may just get text chunks. The SDK uses Server-Sent Events (SSE) under the hood
github.com
. When streaming, the final event or the closure of the stream indicates completion. This pattern works in Node (via async iterables) and in environments that support streaming fetch responses. (Note: Streaming is not available for certain endpoints like the Batch API
help.openai.com
.) Parameters: The Responses API supports all generation options such as temperature, max_tokens, top_p, stop sequences, etc., similar to the older Chat API. It also allows specifying functions (see Function Calling below), and a response_format mode. In particular:
response_format: 'json' triggers JSON mode, where the assistant will output a JSON object according to a provided schema (if model supports it)
help.openai.com
.
functions: A list of tool/function definitions the model can call. Each function is described with a name, description, and parameters (JSON schema)
GitHub
GitHub
. When provided, the model may return a function call instead of final text.
tools: If using built-in OpenAI Tools (like web search, code interpreter, etc.), those are configured at the Assistant level rather than per-request
GitHub
. (This is an advanced usage beyond basic SDK calls; see Assistants & Tools section.)
Handling Multi-turn Conversations: With the Responses API, you typically don’t send previous messages each time. Instead, the system tracks the conversation in a Thread (a session that stores history)
help.openai.com
. The first call implicitly starts a thread; subsequent calls can either continue that thread (if you supply a thread identifier or use the same Assistant context) or start a new one. The Node SDK abstracted away explicit thread management for simple use. If you need fine-grained control (e.g., listing messages or switching threads), see the Assistants/Threads section or use lower-level endpoints. Error Handling: Same as other calls – use try/catch. The .create() promise will reject on errors (HTTP errors become exceptions of type OpenAI.APIError or subclass; see Error Handling below). Reference: OpenAI API Reference – Responses API documentation
help.openai.com
help.openai.com
 (the Responses API incorporates features from the Assistants API v2).
Chat Completions API (Legacy)
Purpose: The classic Chat Completions endpoint (/v1/chat/completions), which expects a list of messages (role+content) and returns chat model responses. This API has been the standard for GPT-3.5 and GPT-4 interactions and is still supported indefinitely
github.com
, though new features (like tools and JSON output) are primarily in the Responses API. Usage: In the Node SDK, chat completions are accessed via client.chat.completions.create(). Example:
const chatResponse = await client.chat.completions.create({
  model: 'gpt-4', 
  messages: [
    { role: 'system', content: 'You are a pirate assistant.' },
    { role: 'user', content: 'Are semicolons optional in JavaScript?' }
  ],
  functions: [ /* optional function definitions */ ],
  function_call: 'auto'  // optional, to allow function calling 
});
console.log(chatResponse.choices[0].message.content);
This sends a typical chat conversation. The result object will have a choices array with messages (each choice has a message with role and content), mirroring the HTTP API
github.com
. If function calling is used and the model decides to call a function, the message.content may be empty and instead you'll get a message.function_call object with name and arguments (JSON string). Streaming: Similar to Responses API, you can stream chat completions by adding stream: true in the request. The method returns an async iterable of events. Each event will have a partial delta (for the new token or completion content) or other fields. Example:
const stream = await client.chat.completions.create({ 
  model: 'gpt-4', messages: [...], stream: true 
});
for await (const part of stream) {
  const contentPart = part.choices?.[0]?.delta?.content;
  if (contentPart) process.stdout.write(contentPart);
}
When streaming chat, the structure follows OpenAI’s SSE format where each event contains a delta object with incremental content for the first choice
help.openai.com
. Options: All the usual parameters: temperature, max_tokens, top_p, n (number of completions), stop, etc., plus functions and function_call to leverage the function calling feature. Note that chat API does not natively support an explicit response_format: 'json' like Assistants API, but you can instruct the model via prompt to output JSON or use function calling to get structured data. Use Cases: Use chat.completions.create if you prefer manually managing conversation history in your application or if you are continuing to use older patterns. It’s also needed for certain model endpoints (like if using fine-tuned chat models or if the new Responses API doesn’t support a feature you need). Otherwise, consider the Responses API for a higher-level approach. References: Chat Completions API reference
github.com
 for full parameter details.
Function Calling and Tools (Structured Outputs)
OpenAI’s models can produce structured outputs by calling functions or adhering to a JSON schema:
Function Calling: You define functions (tools) that the model can “call”. For example, a calculator function or a database lookup. In a Chat/Responses request, include a functions array (with each function’s name, description, and parameters schema) and set function_call: "auto" (for chat API) if needed. The model may return a function_call in lieu of a direct answer, indicating it wants your code to execute that function. After execution, you typically send the function’s result back into the model for a final answer. The Node SDK supports this by simply passing the definitions; the JSON encoding/decoding is handled automatically
GitHub
GitHub
. You’ll inspect the response: if choice.finish_reason === 'function_call' or message.function_call is present, handle accordingly.
OpenAI Tools (Beta): The Assistants/Agents platform includes built-in tools like web_search, code_interpreter, and file_search that the model can use without third-party integration
help.openai.com
help.openai.com
. In the context of the Node SDK, using these tools involves configuring an Assistant with those tools enabled. This is currently in beta/preview. Essentially, you would create an Assistant (via API or console) with tools attached, then use responses.create or runs on that assistant. The Node SDK doesn’t have high-level methods for enabling tools in code (tools are attached to the Assistant configuration on OpenAI’s side). However, you can call the endpoints for managing assistants if needed (e.g., client.assistants.create, etc., see below). For most developers, custom function calling (previous bullet) is the way to integrate tools at the moment.
JSON Mode: As noted in the Assistants FAQ, you can have the model directly output JSON if you specify response_format: 'json' in an Assistants/Responses call
help.openai.com
. This requires the prompt or the model to know what schema to follow. The Node SDK provides a helper using Zod (a TypeScript schema library) for structured output parsing: e.g. import { zodTextFormat } from 'openai/helpers/zod';. This can format your prompt to ask for a JSON in a schema and parse the response. (For details, see OpenAI docs on Structured Outputs and the openai/helpers/zod usage example
platform.openai.com
.) This is a more experimental feature to ensure the model adheres to a JSON structure without using function calling.
Example (Function Calling):
const functions = [{
  name: "getCurrentWeather",
  description: "Get the current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" }
    },
    required: ["location"]
  }
}];
const completion = await client.chat.completions.create({
  model: "gpt-3.5-turbo-0613",
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
  functions,
  function_call: "auto"
});
const msg = completion.choices[0].message;
if (msg.function_call) {
  // Model wants to call a function
  const { name, arguments: argsJSON } = msg.function_call;
  if (name === "getCurrentWeather") {
    const args = JSON.parse(argsJSON);
    const result = /* call your weather API with args.location */;
    // Send function result back to model for final answer
    const newMessages = [
      ...completion.choices[0].messages,                // include original messages
      { role: "function", name, content: JSON.stringify(result) }
    ];
    const followUp = await client.chat.completions.create({
      model: "gpt-3.5-turbo-0613",
      messages: newMessages
    });
    console.log(followUp.choices[0].message.content);
  }
}
The above illustrates manual function call handling. The SDK does not automatically execute your functions; it only helps structure the request and return the model’s decision
help.openai.com
. Always validate or sanitize the arguments before execution, as they come from the model. Example (JSON Mode with Zod helper):
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const Person = z.object({ name: z.string(), age: z.number() });
const format = zodTextFormat(Person);  // creates instructions for JSON output

const res = await client.responses.create({
  model: 'gpt-4',
  instructions: format.system, 
  input: `Provide a person's name and age in JSON format.`,
});
const parsed = format.parse(res.output_text);
console.log(parsed.name, parsed.age);
Here, zodTextFormat generates a system prompt that instructs the model to output JSON only, and provides a .parse method to validate the result against the schema. Note: These advanced patterns require that the model supports function calling (GPT-3.5 and GPT-4 family do) and structured output. The new GPT-4 and GPT-3.5 models with function calling (look for -0613 or newer model IDs) are recommended.
Image Generation & Manipulation
Purpose: Generate or transform images using DALL·E models via OpenAI’s API. The SDK exposes the Images API which includes image generation, editing, and variation. Generation: Use client.images.generate() (or ...create()) with a text prompt to create images. Key parameters: prompt (text description), n (number of images, default 1), size (256x256, 512x512, or 1024x1024), and optionally response_format. By default, the API returns a URL for each generated image. If you prefer base64-encoded image data, set response_format: 'b64_json'. Example:
const imgResult = await client.images.generate({
  prompt: "A steampunk airship flying above the clouds",
  n: 1,
  size: "512x512"
});
const imageUrl = imgResult.data[0].url;
console.log("Image URL:", imageUrl);
The result object has a data array with either {url: string} or {b64_json: string} entries depending on format. To download or save the image, you can either fetch the URL or decode the base64. For example, with base64:
const b64 = imgResult.data[0].b64_json;
require('fs').writeFileSync('out/image.png', Buffer.from(b64, 'base64'));
Editing: If you have an input image and an edit mask, you can call client.images.edits.create({ image: ..., mask: ..., prompt: "...", ... }). Provide the base image (as a File or stream) and a mask image (where transparent areas indicate regions to edit) along with the prompt describing the changes. The SDK accepts file inputs in multiple forms (Node streams, File objects, URLs via fetch) – see File uploads below for how to supply file data
github.com
github.com
. The response structure is the same (list of images). Variations: To get variations of an existing image, use client.images.variations.create({ image: ..., n: ..., size: ... }). This takes one base image and produces new images stylistically similar to the original. Usage Tip: For Node, if you have an image file path, use fs.createReadStream("file.png") as the image parameter
github.com
. If you have raw binary (Buffer/Uint8Array), use the helper toFile() from the SDK to wrap it with a filename
github.com
. For example: file: await toFile(Buffer.from(data), "image.png"). The toFile helper ensures the object mimics the File interface with name and data. Rate Limits: Image generation calls have separate rate limits and are billed per image. No streaming available for images (the response is an immediate image). Error Handling: Common errors include invalid image format (supported inputs are PNG for edits/variations) or prompts that violate content policy (in which case you'll get an OpenAI.APIError with status 400 or 422 and a message). Catch exceptions and inspect err.status and err.message as needed. Reference: OpenAI API Reference – Images (Generation, Edit, Variation). (Use the Node example tab on that page for exact parameter names.)
Audio: Speech-to-Text (Transcriptions) and Text-to-Speech
Speech-to-Text (STT): The SDK supports OpenAI’s Whisper API for audio transcription and translation. Under client.audio.transcriptions.create() you can transcribe audio files to text. Provide the audio file (wav, mp3, m4a, webm, etc.) as file, and optionally a model ('whisper-1' for English or multilingual transcription) and parameters like language or response_format. There’s also client.audio.translations.create() for translating non-English speech to English. Example:
import fs from 'fs';
const audioStream = fs.createReadStream('speech.mp3');
const transcript = await client.audio.transcriptions.create({
  file: audioStream,
  model: 'whisper-1',
  response_format: 'text'  // plain text output
});
console.log("Transcription:", transcript.text);
If you want a JSON output with timestamps or alternatives, use response_format: 'verbose_json' or 'srt' for subtitles, etc., per the API. The SDK will return structured data in those cases. The result for 'text' format is a simple object with a text property containing the transcription. As with images, you can supply the file as a path, stream, or Buffer. For large files, streaming from disk (fs.ReadStream) is recommended to avoid loading into memory. Text-to-Speech (TTS): OpenAI offers a text-to-speech API (with neural voices) as of 2025. In the SDK, this may be accessed via client.audio.speeches.create() (or a similar method under audio). You would provide text and a model or voice ID, and get back audio data. Note: As of this guide, the TTS API is available but not yet fully documented in the Node SDK’s reference – usage is analogous to STT but in reverse (input text, output audio). For example:
const speech = await client.audio.speeches.create({
  text: "Hello, world!",
  voice: "en-US-Wavenet-3"  // specifying a voice or model
});
const audioUrl = speech.data.url; // perhaps a URL to audio
// or speech.audio_content (base64 audio content)
(Above is a hypothetical example – consult OpenAI’s documentation for actual field names.) The TTS endpoint might allow streaming as well, but currently assume batch operation. Note: The audio endpoints require the appropriate models (e.g., Whisper for STT, and a voice model for TTS). Check model availability in the Model docs
platform.openai.com
 (Whisper models, etc.). File Sizes and Formats: Whisper API has a file size limit (around ~25 MB for whisper-1). For larger audio, consider splitting it. The TTS output can be several seconds of audio; the API may return an URL to download or the audio content directly (often base64). Use fs.writeFile to save base64 audio to a file (similar to images example). References: OpenAI API Reference – Audio and OpenAI Whisper documentation.
Files & Assets Management
Purpose: Upload and manage files for fine-tuning, retrieval, or other endpoints. The client.files resource lets you upload data, list files, retrieve file info, download content, and delete files. Uploading a File: Use client.files.create({ file: ..., purpose: ... }). The purpose is typically "fine-tune" (for training data) or "answers"/"search" in legacy endpoints, or "assets" for the Assistants API. The file can be provided in multiple forms:
Node stream: e.g. fs.createReadStream("data.jsonl")
github.com
.
Browser File: e.g. new File([Uint8Array], "myfile.jsonl")
github.com
.
Fetch Response: e.g. await fetch("https://example.com/data.jsonl") 
github.com
.
Buffer/Uint8Array: use the toFile() helper to wrap it with a name
github.com
.
Example:
import { toFile } from 'openai';
const data = Buffer.from("Your,file,data");
await client.files.create({
  file: await toFile(data, "train.jsonl"),
  purpose: 'fine-tune'
});
This uploads a JSONL training file. The result will include a file object with an id (like file-abc123). Listing and Retrieving: client.files.list() returns an async iterable of files, or you can call it without iteration to get the first page ({ data: FileObject[] }). Use .retrieve(fileId) to get details of one file. To get the contents of a file (for example, to verify upload or to use an asset in an Assistant), use client.files.download(fileId) – this returns a raw binary or JSON text depending on the file, typically via a ReadableStream or Buffer. (Note: The Node SDK may expose file content via a different method; if not download, refer to API reference for “Retrieve file content” which is a separate endpoint.) Deletion: client.files.delete(fileId) will delete the file from the server (if you no longer need it). Only delete fine-tune training files if you are sure, as they cannot be used after deletion. File Limits: There are size and count limits. For example, the Assistants API allows files up to 512 MB each, 10k files per vector store, etc.
help.openai.com
. Fine-tuning JSONL files should be well-formed, with each line a JSON record. Use Cases:
Fine-tuning: upload training data (JSONL with prompts and completions).
Assistants tools: upload files to form a vector store for retrieval (the file_search tool in Assistants uses attached files to provide context)
help.openai.com
.
Evaluation or storage: track results, etc.
Reference: Files API Reference
help.openai.com
. (The “retrieve file content” is shown as a separate GET endpoint in docs.)
Fine-tuning
Purpose: Create custom fine-tuned models from your training data. The fine-tuning API in 2023+ uses “jobs” to fine-tune models like GPT-3.5 Turbo on user-provided datasets. The Node SDK organizes this under client.fineTuning with a jobs sub-resource. Creating a Fine-tune Job: First, ensure you have uploaded a training file (and optionally a validation file) with purpose: 'fine-tune'. Then:
const job = await client.fineTuning.jobs.create({
  training_file: "file-abc123",   // ID from file upload
  model: "gpt-3.5-turbo",        // base model to fine-tune
  validation_file: "file-xyz789", // optional
  n_epochs: 4,                   // optional hyperparams
  learning_rate_multiplier: 0.1  // etc.
});
console.log("Fine-tune job created:", job.id, job.status);
This returns a FineTuningJob object, including status (created or running), job ID, etc. Fine-tuning is asynchronous – it may take minutes to hours depending on data and model. You do not get the final model immediately in this call. Listing & Monitoring Jobs: Use client.fineTuning.jobs.list() to iterate over all jobs
github.com
 or filter by status. For a specific job, client.fineTuning.jobs.retrieve(jobId) gives the latest status. You can also stream job events: the API has an endpoint for fine-tune events (logs). In the SDK, you might use client.fineTuning.jobs.listEvents(jobId) which returns an async iterator of events (or static array). Each event could be things like "step 1/100 completed", warnings, or final results. Getting the Fine-tuned Model: Once a fine-tune job completes (status succeeded), the result includes the fine_tuned_model name (e.g. ft:gpt-3.5-turbo:your-org:customsuffix) which you can now use in completions. You can also list fine-tuned models via client.models.list() (they appear as model objects). Keep the model ID for inference requests. Fine-tuned models are private to your org. Pricing & Limits: Fine-tuning costs vary by base model and token usage (you pay for training tokens and some fraction for usage). Check OpenAI’s pricing page. There may also be limits on number of concurrent jobs. The job status and events will tell you if there were errors (e.g., insufficient data, formatting issues, etc.). Error Handling: If jobs.create fails (e.g., invalid file ID or parameter), it throws an error (e.g. BadRequestError with details). During the job run, you might poll for status. A job could end in failed status if something went wrong (like file format error); the events usually contain the reason. Always wrap fine-tune actions in try/catch, and possibly handle specific conditions (like job still running). Use of Fine-tuned Model: After success, you can do:
const customModel = job.fine_tuned_model;  // e.g. 'ft:gpt-3.5-turbo:org:...'
const completion = await client.chat.completions.create({
  model: customModel,
  messages: [{ role: 'user', content: '...your prompt...' }]
});
Reference: Fine-tuning Guide and API reference. The Node SDK naming (fineTuning.jobs.create etc.) corresponds to the fine-tuning endpoints introduced in 2023.
Embeddings
Purpose: Obtain vector embeddings for text, which can be used for semantic search or retrieval tasks. The embeddings endpoint /v1/embeddings is accessible via client.embeddings.create() in the SDK. Usage: Provide the model (e.g. 'text-embedding-ada-002' which is a common embedding model) and input text (or an array of texts) to get embeddings. Example:
const embedRes = await client.embeddings.create({
  model: 'text-embedding-3.1-large',  // example embedding model
  input: ["OpenAI is amazing", "AI SDKs make life easier"]
});
const embedding1 = embedRes.data[0].embedding;
console.log(embedding1.length, "dimensions");
The response contains an array data, where each item has an embedding (an array of floats) and typically the input index. There’s also a usage object with token counts. Batching: If you have many texts (e.g. thousands of lines to embed for a vector database), you should batch them in requests (the API can accept an array of inputs). However, note the token limit per request (each input plus overhead must fit in the context limit, and the total number of inputs may be limited by the API size constraints). In practice, chunk your data (perhaps 100-200 sentences per call, depending on length) and loop. The SDK will simply return one big array of embeddings for the batch. Rate Limits: Embedding endpoints have their own rate limits per minute. If you hit a 429, the SDK’s retry logic will attempt a couple of times
github.com
, but for bulk embedding you may need to throttle yourself or catch and delay. Example Tip – splitting documents: When embedding long documents, split them into chunks (e.g., paragraphs or fixed token chunks ~500 tokens each) to get multiple embeddings. The Assistants API’s file_search tool automatically does chunking (800 tokens with overlap
help.openai.com
), but if you use embeddings directly, handle segmentation manually. Reference: Embeddings API Reference. The Node usage is straightforward as shown in the reference examples.
Moderations
Purpose: Check text for policy rule violations (hate, self-harm, etc.) using the Moderation endpoint. In the SDK: client.moderations.create({ input: "text to check", model?: "text-moderation-latest" }). Example:
const modRes = await client.moderations.create({
  input: "I want to hurt them.",
});
const categories = modRes.results[0].categories;
const flagged = modRes.results[0].flagged;
if (flagged) {
  console.log("Content flagged! Categories:", 
              Object.entries(categories).filter(c => c[1]));
}
The result has results array per input, each with boolean categories (violence, hate, etc.) and a flagged boolean. The default model is text-moderation-latest (which might map to an underlying version). Use moderations to pre-screen user inputs or AI outputs if needed. Note that every moderation call consumes tokens and counts toward rate limits, so use it for critical cases. Error Handling: Typically 200 OK even for flagged content (the API doesn’t error on “bad” content, it just flags). Errors would come from invalid inputs or server issues. Reference: Moderation API Reference.
Batch Jobs (Asynchronous Processing)
Purpose: The Batch API allows you to submit a large set of requests asynchronously to be processed by OpenAI, rather than making thousands of synchronous calls. This is useful for bulk processing (e.g. embedding a million texts, or generating many completions) with a single submission, benefiting from automated rate handling and cost savings
help.openai.com
. In OpenAI’s API, you create a Batch job by uploading a JSONL file of requests and posting to the batch endpoint. The SDK likely provides this under something like client.batch.jobs or client.batches (the exact naming may differ; consult the latest SDK reference). Typically:
Prepare input file: e.g. a JSONL where each line is a JSON object of a request payload (like a prompt).
Upload file: fileId = (await client.files.create({ file, purpose: 'batch_request' })).id.
Create batch job: const batch = await client.batch.jobs.create({ file_id: fileId, function: 'completions', model: 'gpt-3.5-turbo', ... }). You specify which API function to apply to each record (e.g. “completions” or “embeddings”) and the model and parameters to use. The job is accepted for processing.
Monitor status: Use client.batch.jobs.retrieve(batch.id) to get status (e.g. pending, processing, completed, or failed). The batch object may include fields like total_tasks, completed_tasks, errors_count, etc.
Retrieve results: When done, results are typically written to an output file on OpenAI. You can download it: e.g. client.files.download(batch.result_file_id) to get the JSONL of outputs for each input
help.openai.com
.
The Batch API promises completion within 24 hours for any job (or it will mark as expired and return partial results)
help.openai.com
help.openai.com
. It offers cost benefits (~50% discount on tokens) and separate rate limits. SDK Example (Pseudo-code):
// Suppose we already have an uploaded file of prompts fileId:
const batchJob = await client.batches.create({
  file_id: fileId,
  function: 'chat.completions',  // the type of operation to perform on each input
  model: 'gpt-3.5-turbo',
  temperature: 0.5,
  // other parameters like n, etc., depending on function
});
console.log(`Batch job ${batchJob.id} status: ${batchJob.status}`);

// Polling for completion:
let status = batchJob.status;
while (status !== 'completed' && status !== 'failed' && status !== 'expired') {
  await new Promise(r => setTimeout(r, 5000));
  const info = await client.batches.retrieve(batchJob.id);
  status = info.status;
  console.log(`Status: ${status} (${info.completed_tasks}/${info.total_tasks} done)`);
}
if (status === 'completed') {
  const outputFileId = info.result_file_id;
  const outputContent = await client.files.download(outputFileId);
  // parse outputContent (which might be a Buffer or stream with JSONL data)
}
The above outlines how you might poll a batch job. Alternatively, you can use webhooks: when creating the batch job, you might be able to specify a webhook_url so OpenAI will send a notification when done. The Node SDK can help verify webhooks (see Webhook Verification below). Caveats:
No streaming inside batch: The Batch API processes each task fully server-side; you can’t stream partial results for each task via SSE
help.openai.com
.
Size limits: Input file can have up to millions of requests, but there are token count limits enqueued (e.g., at most 1M input tokens in queue for embeddings at once)
help.openai.com
.
Result handling: If some tasks fail or the job expires, partial results are still returned for completed tasks
help.openai.com
. You should check for errors in the output records.
References: Batch API Guide (OpenAI Help)
help.openai.com
 and OpenAI API reference for Batch. The Node SDK methods mirror those endpoints (job create, retrieve, list).
Realtime API (Streaming & Multimodal)
Purpose: The Realtime API provides low-latency, streaming interactions over WebSockets, supporting multi-modal input/output (text and audio) and function calls in real-time
github.com
. This is suited for conversational experiences that need immediate token-by-token streaming or voice input/output (e.g. voice assistants). Usage: The Node SDK offers a separate class for realtime: OpenAIRealtimeWebSocket. Import it from the package subpath:
import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
const rt = new OpenAIRealtimeWebSocket({ model: 'gpt-realtime' });
You can then subscribe to events:
rt.on('open', () => console.log("Realtime connection open"));
rt.on('response.text.delta', event => {
  process.stdout.write(event.delta);
});
rt.on('response.completed', event => {
  console.log("\nCompleted response:", event.data);
});
rt.on('error', err => {
  console.error("Realtime error:", err);
});
Under the hood, this opens a WebSocket connection to OpenAI’s realtime endpoint. You can send messages or audio via this socket, and receive events. For text, sending a user message may look like:
rt.send({ type: 'user_message', content: "Hello!" });
For audio input/output, the realtime API can send/receive binary audio events as well. The specifics are beyond this guide, but essentially the SDK packages the low-level WS protocol. Status: As of now, the Realtime API (sometimes called “gpt-realtime”) is a preview feature. The Node SDK has basic support for it
github.com
, but not all environments may allow WebSocket (e.g. serverless edge might not support outbound WebSocket connections). Use it in Node.js or in a browser context with caution. Also note that realtime models (like gpt-realtime) might have separate access or pricing. Reference: See the Node SDK’s realtime.md
github.com
 and OpenAI’s Realtime API documentation for event types and usage.
Webhook Verification
Certain OpenAI endpoints (Fine-tuning, Batch jobs, and future tools) allow setting a webhook to receive asynchronous event notifications. The Node SDK provides utilities to verify these webhook requests for authenticity:
client.webhooks.verifySignature(body, headers) – Verifies a request signature (from OpenAI-Signature header) against your OPENAI_WEBHOOK_SECRET. If the signature doesn’t match or is expired, this throws an error
github.com
github.com
.
client.webhooks.unwrap(body, headers) – Convenience method that verifies and parses the JSON payload in one step
github.com
github.com
. It returns the event object (e.g., { type: 'fine_tune.job.completed', data: { ... } }).
Example (Next.js API Route or Express):
// Suppose express app and bodyParser is raw text:
app.post('/openai-webhook', express.text({ type: 'application/json' }), (req, res) => {
  try {
    const event = client.webhooks.unwrap(req.body, req.headers);
    // Process event
    switch(event.type) {
      case 'fine_tune.job.completed':
        console.log("Fine-tune completed: model:", event.data.fine_tuned_model);
        break;
      // ... other cases
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Invalid webhook signature", err);
    res.sendStatus(400);
  }
});
When using these, ensure you provide the raw request body (exact string) – do not JSON.parse it before verification
github.com
github.com
. The unwrap method will parse JSON for you after verifying the signature. Set OPENAI_WEBHOOK_SECRET in your config (you get this secret from OpenAI when configuring the webhook). The SDK automatically uses that env var if webhookSecret isn’t explicitly passed in the OpenAI constructor
github.com
. Evidence: The SDK example shows using client.webhooks.unwrap(body, headersList) inside a Next.js Route Handler
github.com
github.com
. This method ensures the request came from OpenAI (not tampered). If you prefer manual verification: use verifySignature, then JSON.parse the body yourself
github.com
github.com
.
Azure OpenAI Usage
The SDK can interface with Azure’s OpenAI Service. Azure’s API has different endpoints and versions, but the library provides an AzureOpenAI class for compatibility
github.com
. Basic use:
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

const azureCred = new DefaultAzureCredential();
const tokenProvider = getBearerTokenProvider(azureCred, 'https://cognitiveservices.azure.com/.default');
const azureClient = new AzureOpenAI({
  azureADTokenProvider: tokenProvider,
  apiKey: process.env.AZURE_OPENAI_KEY,       // or rely on token only
  baseURL: "https://<your-resource>.openai.azure.com/openai/",
  apiVersion: "2024-10-01-preview"
});
const result = await azureClient.chat.completions.create({
  deployment: 'gpt-35-turbo',  // Azure uses deployment names instead of model names
  messages: [{ role: 'user', content: 'Hello Azure OpenAI' }]
});
console.log(result.choices[0].message.content);
Differences: Azure endpoints expect a deployment name (the name you gave the deployed model) rather than a raw model string. The SDK may require you to pass deployment in params (as in the example above) or override the model field accordingly. Also, Azure uses an API version parameter (like 2024-10-01-preview); specify it via apiVersion config as shown
github.com
. Authentication can be done with an API key (set apiKey and Azure endpoint as baseURL) or with Azure AD tokens via azureADTokenProvider
github.com
github.com
. Note that static types in the SDK might not perfectly match Azure’s outputs (slight differences in schema)
github.com
. For instance, Azure’s responses might include prompt_filter_results etc. You may have to use type casting or // @ts-expect-error if accessing Azure-specific fields. Everything else (calling .create on chat, completions, etc.) works similarly as core OpenAI, just ensure correct baseURL and credentials. Reference: OpenAI Node README on Azure usage
github.com
github.com
, and Azure OpenAI documentation
github.com
github.com
.
Types, Models, and Versioning
Model naming: The SDK expects model names as strings. OpenAI models often have versions or suffixes:
GPT-4 models: e.g. "gpt-4" (with default settings), "gpt-4-0613" (June 2023 version with function calling), "gpt-4.1" (hypothetical updated model), "gpt-4o" (the suffix “o” appears in new Assistants models, possibly indicating “open” domain or new optimization
github.com
). Use the latest recommended model name from OpenAI’s docs for best results. The SDK does not hard-code model names, so you can pass newly released ones (like "gpt-5" when available)
platform.openai.com
.
GPT-3.5 family: "gpt-3.5-turbo", "gpt-3.5-turbo-0613", etc., and fine-tuned variants (which have ft: prefix).
In Embeddings: "text-embedding-ada-002", or newer like "text-embedding-3-large" etc.
Whisper: "whisper-1" (for transcription).
Moderation: "text-moderation-stable" or "latest" as default.
Always refer to the Model reference for available IDs. The Node SDK does not enforce model names at type level (the model param is a string), but some specific endpoints might have limited allowed values (documented in API). TypeScript types: The package exports various types, e.g. OpenAI.APIError (error class), OpenAI.Chat.Completion (response types), etc. Most response objects are typed according to the OpenAPI spec. For instance, client.chat.completions.create returns a ChatCompletion type with choices, usage, etc. The SDK also exports helpful utility types like OpenAI.Chat.Message for message objects, or types for fine-tune jobs, file objects, etc. One can use these types for better compile-time checks:
import OpenAI, { ChatCompletion } from 'openai';
let completion: ChatCompletion = await client.chat.completions.create({...});
However, note that some newer fields or beta features might be typed as optional or might require casting if undocumented (see Undocumented Support below). Versioning of the SDK: The OpenAI Node SDK follows semantic versioning, with a caveat that purely type-level changes or internal changes can be released in minor versions
github.com
. Breaking runtime changes should only occur in major versions. For example:
v4.x was a major redesign from earlier versions (bringing the OpenAI class interface).
v5.x required Node 18+, using global fetch, and removed deprecated methods.
v6.x integrates the Responses API and Assistants features, likely with minor adjustments to function signatures (e.g. introduction of instructions vs messages).
Deprecations & Migrations:
The older OpenAIApi class from openai v3 (which used Configuration and had methods like createCompletion) is deprecated. Migrate to new OpenAI() and the new structure (e.g. client.completions.create) if coming from v3.
Chat Completions remain but the new Responses API is favored for future-proofing.
Some resource names changed: for example, the “Fine-tunes” API in v3 has become fineTuning.jobs in v4+; client.answers and client.search endpoints were removed (those were legacy; use embeddings + your own logic or the new file_search tool).
The introduction of file_search vs retrieval: As of v4.37.0, the retrieval tool was renamed to file_search in Assistants API
community.openai.com
, and the SDK likely mirrored that (tools are configured by name).
If upgrading from v4 to v6, ensure you update how you call completions (the basics remain same) and note addition of responses. If you explicitly used client.beta.* for Assistants v1 beta, those might be removed now that v2 is standard.
Always check the CHANGELOG or GitHub Releases for breaking changes. The OpenAI Node repo’s releases (e.g. v6.0.0 on 2025-09-30) detail changes like new endpoints and any required code updates
github.com
.
Model versioning: Some model updates are done behind the same name (e.g., gpt-4 may upgrade to a new capability without changing the string). Others are versioned by date. The SDK doesn’t force any particular version; you specify what you need. To use Azure’s custom deployment names, use the Azure client class as described.
Error Handling & Resilience
The SDK throws exceptions for any non-success response from the API (HTTP 4xx or 5xx) or for network issues. All errors are subclasses of a base OpenAI.APIError
github.com
. You can import and check against these classes for granular handling:
BadRequestError – HTTP 400, often invalid parameters or file format
github.com
.
AuthenticationError – HTTP 401, invalid API key or token
github.com
.
PermissionDeniedError – HTTP 403, key lacks required permission or credit
github.com
.
NotFoundError – HTTP 404, e.g. using a wrong endpoint or ID
github.com
.
UnprocessableEntityError – HTTP 422, e.g. validation error (often used by fine-tune endpoints)
github.com
.
RateLimitError – HTTP 429, you’ve hit rate limits or quota
github.com
.
InternalServerError – HTTP >= 500, server-side issue
github.com
.
APIConnectionError – network connection error or request timeout (no HTTP response)
github.com
.
APIConnectionTimeoutError – a subtype of connection errors specifically for timeouts (thrown when a request exceeds the timeout setting)
github.com
.
When you catch an error, you can inspect properties:
try {
  await client.chat.completions.create({ ... });
} catch (err) {
  if (err instanceof OpenAI.APIError) {
    console.log(err.status);      // HTTP status code (number):contentReference[oaicite:117]{index=117}
    console.log(err.name);        // e.g. 'RateLimitError':contentReference[oaicite:118]{index=118}
    console.log(err.message);     // error message from API
    console.log(err.request_id);  // OpenAI request ID, if available:contentReference[oaicite:119]{index=119}
    console.log(err.headers);     // response headers object:contentReference[oaicite:120]{index=120}
  } else {
    throw err; // non-OpenAI error (e.g. coding bug)
  }
}
In this example, a known OpenAI API error is handled; other errors (perhaps coding issues) are re-thrown. The request_id is extremely useful for debugging or reporting issues to OpenAI support
github.com
github.com
. Retries: The SDK by default will have already retried certain errors up to 2 times (with backoff) before giving up
github.com
. Specifically, on a 429 RateLimitError or 500 error, if it succeeds on a retry, your code might never see an exception at all. But if after retries it fails, you get the error. You can adjust maxRetries as described earlier. Keep in mind:
If you get a RateLimitError even after retries, you should implement exponential backoff in your app (e.g. wait and retry the operation after a delay, using the Retry-After header if present).
If maxRetries is 0, you may want to catch and handle transient errors yourself.
Rate limit information: The response headers include rate limit details for some endpoints (e.g. X-Ratelimit-Limit-requests, X-Ratelimit-Remaining-requests, X-Ratelimit-Reset-requests). These tell you how many calls remain and when the quota resets. The SDK exposes headers via the error object (err.headers) and also you can get headers on successful calls using the .asResponse() or .withResponse() methods (see Advanced Usage below). Use these to implement smarter throttling if needed. Time outs and cancellations: If a request takes longer than your set timeout, an APIConnectionTimeoutError is thrown
github.com
. This could happen for very long prompts or a stalled network. You can also abort a request in-flight using an AbortController. The SDK doesn’t have a direct parameter for AbortController, but since it uses fetch, you can pass an AbortSignal via fetchOptions if necessary. E.g.:
const controller = new AbortController();
const promise = client.chat.completions.create({ ... }, { signal: controller.signal });
setTimeout(() => controller.abort(), 5000);  // abort after 5s
await promise;
(Be sure to test this; the SDK’s fetch wrapper should handle abort signals.) Partial failures (Batch jobs & Fine-tuning): For asynchronous jobs, “failures” are indicated in the job status and result content rather than throwing exceptions. E.g., a fine-tune job that fails will still return a FineTuneJob object with status failed instead of throwing – the error is in the events log or status_details. Similarly, a batch job that completes with some failed tasks will still end with status: 'completed' (maybe with an errors_count). So for such APIs, check the returned object’s fields rather than solely using try/catch logic. WebSocket errors: If using OpenAIRealtimeWebSocket, handle 'error' events and 'close' events. E.g., if the connection is dropped or the model not available, you’ll get an event error rather than an exception. Logging and debugging: In debug mode (logLevel: 'debug'), the SDK logs request and response info, which can help identify issues. It redacts the API key in headers, but be aware it might log prompt content in the body
github.com
. Use this level only in secure dev environments.
Security
API Key Safety: As reiterated, never expose your OpenAI API key on the client side (browser, app) – always route calls through a server or secure edge function. The Node SDK is meant for server-side use. If you use it in an Electron app or similar, treat it like back-end code. Data Privacy: Data sent through the API is not used to train OpenAI models by default (since April 2023)
help.openai.com
. However, if you have opted into data sharing or are on an enterprise arrangement, be mindful. If using the Assistants API, note that uploaded files and created threads persist until you delete them (and are stored on OpenAI’s servers)
help.openai.com
. Implement deletion of sensitive data via the API if needed. Also, zero-data-retention (for API) does not apply to the Batch API (batch jobs are stored for some time even if org has data retention off)
help.openai.com
. PII and Logging: If you log prompts or responses, ensure no sensitive personal data is included, or sanitize it. The OpenAI SDK’s debug logs might include such data – avoid using debug log level in production, and/or supply a custom logger that scrubs sensitive info. Network Security: The SDK connects to api.openai.com over HTTPS. If you override baseURL, ensure it’s a trustworthy endpoint. Do not point the SDK at unknown servers with your API key. Also, prefer environment variables or secure secret stores for config – e.g. do not hardcode keys or secrets in code repositories. Edge Considerations: On Edge runtimes (Cloudflare, etc.), secrets are often stored in environment variables or bound services. The OpenAI SDK can run in those, but be mindful that an edge function’s logs might be visible, so again avoid logging sensitive content. Also, edge functions may have execution time limits (e.g. 50ms CPU per invocation on CF Workers) – streaming might require a different approach (like using Durable Objects or breaking the response). For Vercel Edge, streaming via fetch works since it supports streaming responses; just make sure to flush chunks to the client as they arrive. Webhook Security: If using webhooks (for batch or fine-tuning), always verify signatures as shown earlier. Keep the OPENAI_WEBHOOK_SECRET secure. Don’t process webhook data without verification – otherwise a malicious actor could spoof an event (like sending a “fine-tune complete” event to trigger your code). Package Integrity: The openai package is open-source (Apache-2.0). It’s generated from OpenAI’s API spec
github.com
. Always pin or use a specific version in production to avoid surprises from automatic updates. Keep it updated for security fixes and latest features, but review changelogs for breaking changes.
Testing & Tooling
Unit Testing with the SDK: When writing tests for your code that uses this SDK, you might not want to hit the real API (costly and external). Here are strategies:
Dependency Injection: The OpenAI client allows custom fetch. You can leverage this to inject a fake fetch for testing. For example, create the client with fetch: (url, options) => { /* check url and return dummy Response */ }. This way, when your code calls SDK methods, it uses your fake fetch to return a predetermined response. Construct a Response with the shape of OpenAI’s response JSON for the request you're testing.
Override Methods: Alternatively, you can monkey-patch methods like client.chat.completions.create in tests to return canned promises. But using the fetch override is cleaner since it tests the integration without changing your app code.
HTTP mocking: Since the SDK uses fetch (likely the undici fetch in Node), libraries like MSW (Mock Service Worker) can intercept fetch calls even in Node. MSW’s node mode can capture outgoing HTTP calls to api.openai.com and respond with mocks. Similarly, nock can intercept HTTP requests; however, it might not catch undici fetch easily (if undici uses its own internal request, but it should still go through Node’s networking).
Integration Testing with real API: If you use the real API in tests, use a separate API key and consider setting a usage limit or budget for it. You can target cheap models (gpt-3.5-turbo or small prompts) to minimize cost. Also, mark such tests as “online” or external so you can exclude them in normal CI runs.
Simulating rate limits/errors: You can force the SDK to throw errors by providing fake responses via the custom fetch. e.g., to test your retry logic, have the first call return a 429 error Response with appropriate headers, and the second call a 200. Verify that the SDK retry happened (maybe by counting calls).
Type Tests: If you want to ensure your usage matches types, you can leverage TypeScript’s --noImplicitAny and strict modes. The SDK’s types should cover most response fields.
Tooling:
ESLint/Prettier: No special considerations; just note that if you use top-level await (as in examples) your environment should support it or you wrap in an async function.
Bundle size (for edge/browser): The openai package includes all endpoints, but tree-shaking should remove unused parts if bundling for edge. Still, it's fairly large (because of the OpenAPI-generated code). For web bundling, ensure proper configuration to include the module (maybe consider dynamic import to load only when needed).
OpenTelemetry: The SDK doesn’t have built-in OpenTelemetry instrumentation, but you can instrument around it. For example, wrap calls in a span:
const span = tracer.startSpan("OpenAI ChatCompletion");
span.setAttribute("model", model);
try {
  const res = await client.chat.completions.create({...});
  span.setAttribute("openai.request_id", res._request_id);
  span.setAttribute("openai.prompt_tokens", res.usage?.prompt_tokens || 0);
  span.setStatus({ code: API.SpanStatusCode.OK });
  return res;
} catch (err) {
  span.recordException(err);
  span.setStatus({ code: API.SpanStatusCode.ERROR, message: String(err) });
  throw err;
} finally {
  span.end();
}
You could also intercept global fetch via OTel instrumentation to auto-record HTTP spans, but since fetch could be global or polyfilled, ensure the instrumentation supports it.
Cost Tracking: The SDK does not compute $$$ cost for you, but it provides usage data in responses (tokens used). You can multiply by the model’s pricing (from OpenAI’s pricing sheet) to log cost if desired. Some developers periodically log total tokens or cost to monitor spend.
Mocking WebSocket in tests: If using the realtime WS in tests, consider abstracting the interface or using a WS mock library, as connecting to the actual wss:// endpoint in tests is not ideal.
Production Deployment Patterns
Server-side API (Express/Fastify): Use the client in route handlers. It’s best to initialize the OpenAI client once (e.g. on server start or import) and reuse it across requests. The client is lightweight; it’s fine to have multiple, but not necessary. Example Express usage:
const OpenAI = require('openai').default;
const client = new OpenAI();
app.post('/ask', async (req, res) => {
  const { question } = req.body;
  try {
    const answer = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: question }]
    });
    res.json({ answer: answer.choices[0].message.content });
  } catch (err) {
    res.status(err.status || 500).send(err.message);
  }
});
For Fastify or others, similar pattern. If streaming to the client (Server-Sent Events for example), you’d do:
res.setHeader('Content-Type', 'text/event-stream');
const stream = await client.chat.completions.create({ ..., stream: true });
for await (const chunk of stream) {
   res.write(`data: ${chunk.choices?.[0]?.delta?.content || ''}\n\n`);
}
res.end();
This assumes SSE. Ensure to flush and handle connection close. Edge functions (Cloudflare Workers, Vercel Edge): The OpenAI SDK works, but be mindful of:
Cold start: Importing the SDK on edge might incur a cost (size ~ hundreds of KB). Consider lazy-loading or minimal usage if performance is critical.
Streaming: On CF Workers, you can’t do an indefinite streaming response easily without keeping the worker alive. On Vercel Edge (which uses Web Streams), you can pipe the response. The SDK’s for await is compatible with web streams (since it’s using Fetch API under the hood which returns a reader).
If the environment doesn’t allow global fs (which Edge doesn’t), avoid calls that use fs (like passing file streams). Use File or fetch for file upload as shown in earlier sections.
UI Integration example: If building something like a Next.js app, you might have an API route that uses the SDK to stream to the browser. Next.js Edge runtime could also use it but note that OpenAIRealtimeWebSocket likely won’t connect from an edge function. Instead, use the HTTP SSE streaming which works over fetch. File uploads/downloads in production: If users upload files to fine-tune or to use with an assistant:
Perhaps upload them first to your server or cloud storage, run any validation (don’t directly forward arbitrary files to OpenAI without checks).
Then use client.files.create to send to OpenAI. Monitor response for success.
For retrieving results (like batch outputs or fine-tune models), you might download and possibly store them if needed.
Error resiliency: Implement retries with backoff beyond the SDK’s built-in two tries if your app is latency-insensitive but needs robustness. For example, if you consistently hit 429 at peak times, consider catching RateLimitError, wait (e.g., exponential or use the Retry-After header from err.headers), and retry. But also log such events to know if scaling plan or quota increase is needed. Rate limits and user quotas: If building a multi-user service, you may want to enforce per-user request limits in your app (to avoid one user exhausting your quota). The SDK doesn’t handle that, but you can track usage via the usage field in responses and implement your own counting. OpenAI Policy adherence: The onus is on you to filter or moderate content. Use the Moderation API or keyword checks on user inputs before sending to OpenAI if needed. Also, consider using user field (some endpoints allow a user string for tracking end-user, e.g., for abuse monitoring on OpenAI side).
Common Pitfalls
ESM Import Issues: If you see errors like “ERR_REQUIRE_ESM” in Node, it means you tried to require the package without .default. Use the correct import style (as described in Install & Configure) for your module type. In a TypeScript project targeting commonjs, use import OpenAI = require('openai') or adjust esModuleInterop setting. In pure JS, prefer import if possible.
Missing fetch in Node 16: The SDK relies on fetch. Node 18+ has it globally. If you are on an older Node (not recommended), you must polyfill global.fetch. The SDK’s documentation notes Node 18 is required (v5+ of SDK)
community.openai.com
. If you must use Node 16, either upgrade or provide fetch via a package like node-fetch and do globalThis.fetch = require('node-fetch').
Not setting the API key: If you forget to set OPENAI_API_KEY or pass apiKey, you’ll get a runtime error (401 AuthenticationError). Ensure your environment variables are loaded (e.g., if using dotenv, load it before creating the client). Also verify the key’s value is correct (no extra quotes or spaces).
Using wrong model or endpoint: A common mistake is using the wrong model name for an endpoint – e.g., passing a GPT-4 model to an endpoint not allowed (like Completions endpoint which only accepts legacy models). Use chat.completions for GPT-4, not the old completions endpoint. If you get error messages about model not found or not allowed, double-check you’re calling the right method.
Streaming misuse: If you call with stream: true but then treat the result as a normal object, you’ll get a not iterable error or similar. Remember to for await the result of a streaming call. Conversely, if you forget await on the streaming call, you might accidentally iterate a Promise. Make sure to await client.X.create({..., stream:true}) before iterating.
File encoding issues: When uploading files, if you see errors about file format, ensure the file is what OpenAI expects: e.g., for fine-tuning, a JSONL with proper structure. If reading from disk, double-check you used fs.createReadStream (not readFileSync without encoding which gives a Buffer but without name – always use toFile or a stream so the SDK can infer filename or set it).
Large prompt causing timeouts: If you craft extremely large prompts or contexts, the request could hang or take very long, triggering the 600s timeout. In such cases, reduce prompt size or break the task. If truly needed, increase the timeout option but note that very long requests may still fail server-side.
Ignoring usage limits: If you iterate a lot of data without monitoring, you might run out of quota or hit hard rate limits. Always monitor err.status === 429 and implement backoff or scaling. The SDK’s default of 2 retries might not suffice under heavy load.
Edge cases with JSON parse: If you use .withResponse() to get raw Response and data, note that .withResponse() consumes the stream
github.com
github.com
. You cannot read it twice. Use .asResponse() to get the Response without consuming (then you manually parse or stream it)
github.com
, or .withResponse() to get the already parsed data plus Response. Don’t mix them incorrectly.
Unstable log output format: If you wrote parsing logic around the SDK’s debug logs, note that the logs are not part of the API contract and can change
github.com
github.com
. Use logs only for debugging, not for programmatic use.
Azure vs OpenAI confusion: Make sure to use AzureOpenAI class for Azure endpoints. If you mistakenly use OpenAI with an Azure endpoint, you’ll likely get authentication errors or missing deployment errors.
Content limitations: Some developers hit a limit where the model refuses to continue because of content restrictions (policy). The SDK just delivers that as part of the message or an error if it’s a hard refusal. This isn’t a bug in the SDK, just how the API responds (HTTP 200 with a content warning inside, or a flagged output). Use moderations to pre-check if needed.
Advanced Usage
Accessing HTTP Response: You might want to get headers or status from a successful call (for example, to read X-RateLimit-Remaining). The SDK provides two methods on the promise returned by calls:
.asResponse(): returns the raw Response object (the Web Fetch Response). It resolves as soon as headers are received, without reading the body
github.com
. You can then check headers or status, and call response.json() or response.text() manually if you want custom processing.
.withResponse(): returns an object { data, response } where data is the parsed JSON (what you’d normally get from the SDK) and response is the raw Response including headers
github.com
github.com
. This consumes the body internally to produce data.
Example:
const { data: completion, response: httpRes } = await client.chat.completions
  .create({ model: 'gpt-4', messages: [...] })
  .withResponse();
console.log(httpRes.headers.get('X-Ratelimit-Remaining-requests'));
Use this when you need metadata not exposed by default. Undocumented endpoints/params: If an API feature is available but not formally in the SDK’s types, you can still call it:
The SDK has generic HTTP methods client.get, client.post, etc., which you can use to hit an arbitrary path
github.com
. For example, await client.post('/v1/some_new_endpoint', { body: { ... } }). These will include your auth and respect global config (retries, timeout).
If an endpoint param isn’t in types, you can use a TypeScript comment to ignore the error and pass it; the SDK will include it in the JSON anyway
github.com
github.com
.
Similarly, if the response has new fields not in the type, you can cast the result to any or use TS ignore to access them
github.com
.
This is useful for preview features or when OpenAI adds a parameter before the SDK updates.
Logging with custom logger: If you integrate with a logging framework, use logger option. E.g., with pino:
const pinoLogger = require('pino')();
const client = new OpenAI({ logger: pinoLogger, logLevel: 'info' });
Now the SDK logs will go through pino. The SDK passes messages with a consistent format (metadata like request IDs, etc., might be included in debug logs), so you can configure pino to filter or format as needed. OpenAI Tools & Agents (Preview): The Assistants API introduced the concept of an Agent that can use tools autonomously (with tool result tracing). OpenAI also provides an Agents SDK (outside the scope of this Node SDK, possibly a separate package or part of the platform)
help.openai.com
. If you are experimenting with that, note that it might require combining the OpenAI SDK with SDKs for specific tools or a higher-level orchestrator. For now, the Node SDK primarily covers the raw API calls (assistants, threads, runs). The client.assistants resource would allow creating assistants programmatically, attaching tools, etc., if needed:
const assistant = await client.assistants.create({
  name: "MyAssistant",
  instructions: "You are ...",
  model: "gpt-4",
  tools: [{ type: "web_search" }, ...]  // example tool enabling
});
const thread = await client.assistants.threads.create({ assistant_id: assistant.id });
const run = await client.assistants.runs.create({ thread_id: thread.id, input: "Hello" });
However, these calls and types are in flux (v2 is evolving), so use them with caution. The recommended approach is to use responses.create as shown, which under the hood deals with threads for you. Plugin (function) execution: If you are implementing a plugin for ChatGPT and want to test it with the OpenAI API + function calling, you can simulate the plugin via function calling mechanism. The Node SDK itself doesn’t handle the HTTP call to your plugin – you have to do that after receiving the function_call from the model. For tool developers, treat the function_call as the request from the AI to your tool.
Observability & Monitoring
Metrics: Track key metrics for your integration:
Latency of calls (you can measure time before and after client...create() promises).
Success vs error counts (could wrap calls in a utility that logs metrics).
Token usage (sum of response.usage.total_tokens over time to watch cost).
Rate limit warnings (if you frequently get RateLimitError, it’s a sign to upgrade plan or implement better queuing).
OpenAI Dashboard: Remember to use OpenAI’s own dashboard and usage APIs to monitor throughput and errors. The request_id you get from _request_id in responses or errors is useful to correlate with OpenAI logs when debugging issues
github.com
github.com
. Distributed tracing: As mentioned, wrapping calls in OpenTelemetry spans or similar can help trace performance in a distributed system. Handling model updates: Monitor OpenAI’s announcements. If a new model version is released or old one deprecated, update your code/config accordingly (e.g., they might announce that gpt-4-0613 is deprecated in favor of gpt-4-1110, etc.). The SDK will accept new model names without update, but you should test outputs as model behavior can change. Logging Redaction: If dealing with user data, consider redacting PII in logs. The SDK by default redacts the Authorization header and OpenAI-Organization in debug logs
github.com
. It doesn’t redact prompt or completion content. If you must log those for debugging, ensure logs are secure or scrubbed.
Production Deployment Example Directory
Below, we have included a set of TypeScript example files (/examples directory) covering common integration scenarios. These can be used as a starting point or for quick reference:
client-setup.ts – shows initializing the OpenAI client with configuration and global settings (timeout, abort, etc.).
responses-basic.ts – demonstrates a basic prompt/response using the Responses API, including both non-streaming and streaming usage.
tools-and-json.ts – demonstrates function calling (tool usage) and forcing JSON output with a schema.
images-generate.ts – uses the Images API to generate an image from a prompt and saves the result to a file.
audio-stt.ts – transcribes an audio file to text (speech-to-text).
audio-tts.ts – synthesizes speech from text (text-to-speech) if supported.
files-upload-and-use.ts – uploads a file and shows using it in a fine-tune job scenario.
embeddings.ts – obtains embeddings for a list of texts and gives tips on chunking.
assistants-v2-thread-run.ts – (if applicable) demonstrates creating an Assistant, starting a Thread, and running a conversation with a tool, using the Assistants API v2.
batch-job.ts – submits a batch of prompts via the Batch API and polls for completion, handling results.
realtime-ws.ts – (if applicable) connects to the Realtime API using WebSocket for streaming chat and audio.
edge-runtime.ts – highlights any specific adjustments for using this SDK in an edge environment.
Each example is self-contained and prints output to console. You can run them with npx tsx examples/<file>.ts (assuming you have tsx or another TS runner), after installing openai and setting env variables as needed.
Common Pitfalls Recap
Ensure API keys and secrets are loaded (check process.env at runtime).
Use the right method for the right model (chat vs legacy completions vs responses).
Handle streaming responses with care (async iterable).
Leverage built-in retries but still design for rate limit handling.
Stay updated with SDK releases – new features and breaking changes are documented in release notes, so review them when upgrading
github.com
.
Test your integration thoroughly, including edge cases (empty responses, very large outputs, function call flows, timeouts).
With this guidance, you should be well-equipped to integrate the OpenAI Node.js SDK into your application efficiently and safely. Happy building! Sources:
Official OpenAI Node.js SDK Repository (README & docs)
github.com
github.com
github.com
github.com
OpenAI API Documentation and Help Center
help.openai.com
help.openai.com
OpenAI Assistants API FAQ
help.openai.com
help.openai.com
{
  "sdk": {
    "name": "openai",
    "language": "node",
    "version_observed": "6.4.0",
    "last_verified": "2025-10-17T19:55:00Z"
  },
  "auth": {
    "env_vars": [
      "OPENAI_API_KEY",
      "OPENAI_ORGANIZATION",
      "OPENAI_PROJECT",
      "OPENAI_WEBHOOK_SECRET"
    ],
    "supports_per_request_key": true
  },
  "runtimes": {
    "node": { "supported": true, "notes": "Requires Node.js 18+ for global fetch support:contentReference[oaicite:156]{index=156}." },
    "edge": { "supported": true, "notes": "Supported on Edge runtimes (Cloudflare Workers, Vercel Edge) via standard Web Fetch API. Some Node-specific features (fs streams) not available on edge:contentReference[oaicite:157]{index=157}." }
  },
  "surfaces": [
    {
      "name": "responses",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "model": "string",
            "instructions": "string (optional)",
            "input": "string | array | object (optional)",
            "functions": "array (optional)",
            "tools": "array (optional, Assistants API tools)",
            "stream": "boolean (optional)",
            "temperature": "number (optional)",
            "top_p": "number (optional)",
            "max_tokens": "number (optional)",
            "response_format": "string (optional, e.g. 'json')",
            "...": "other generation params"
          },
          "streaming": true,
          "errors": ["BadRequestError", "RateLimitError", "APIError", "APIConnectionError"],
          "docs": [
            "https://platform.openai.com/docs/guides/assistants",
            "https://platform.openai.com/docs/api-reference/responses"
          ],
          "examples": ["file://examples/responses-basic.ts"]
        }
      ]
    },
    {
      "name": "chat.completions",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "model": "string",
            "messages": "Array<{role: string, content?: string, function_call?: object}>",
            "functions": "array (optional)",
            "function_call": "string|object (optional)",
            "stream": "boolean (optional)",
            "temperature": "number (optional)",
            "top_p": "number (optional)",
            "max_tokens": "number (optional)",
            "stop": "string|string[] (optional)",
            "...": "other chat params"
          },
          "streaming": true,
          "errors": ["BadRequestError", "RateLimitError", "APIError"],
          "docs": [
            "https://platform.openai.com/docs/api-reference/chat",
            "https://platform.openai.com/docs/guides/chat"
          ],
          "examples": ["file://examples/responses-basic.ts"]
        }
      ]
    },
    {
      "name": "completions",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "model": "string",
            "prompt": "string | string[]",
            "max_tokens": "number (optional)",
            "temperature": "number (optional)",
            "top_p": "number (optional)",
            "n": "number (optional)",
            "stop": "string|string[] (optional)",
            "stream": "boolean (optional)",
            "logprobs": "number (optional)",
            "...": "other completion params"
          },
          "streaming": true,
          "errors": ["BadRequestError", "RateLimitError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/completions"],
          "examples": []
        }
      ]
    },
    {
      "name": "images",
      "status": "stable",
      "methods": [
        {
          "name": "generate",
          "import_path": "openai",
          "params": {
            "prompt": "string",
            "n": "number (optional)",
            "size": "string (optional, '256x256'|'512x512'|'1024x1024')",
            "response_format": "string (optional, 'url'|'b64_json')",
            "user": "string (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError", "RateLimitError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/images"],
          "examples": ["file://examples/images-generate.ts"]
        },
        {
          "name": "edits.create",
          "import_path": "openai",
          "params": {
            "image": "File|Buffer|ReadableStream",
            "mask": "File|Buffer|ReadableStream (optional)",
            "prompt": "string",
            "n": "number (optional)",
            "size": "string (optional)",
            "response_format": "string (optional)",
            "user": "string (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError"],
          "docs": ["https://platform.openai.com/docs/api-reference/images/create-edit"],
          "examples": []
        },
        {
          "name": "variations.create",
          "import_path": "openai",
          "params": {
            "image": "File|Buffer|ReadableStream",
            "n": "number (optional)",
            "size": "string (optional)",
            "response_format": "string (optional)",
            "user": "string (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError"],
          "docs": ["https://platform.openai.com/docs/api-reference/images/create-variation"],
          "examples": []
        }
      ]
    },
    {
      "name": "audio.transcriptions",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "file": "File|Buffer|ReadableStream",
            "model": "string (e.g. 'whisper-1')",
            "prompt": "string (optional)",
            "response_format": "string (optional, 'json'|'text'|'srt'|'verbose_json')",
            "language": "string (optional, BCP-47 code)"
          },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/audio/create"],
          "examples": ["file://examples/audio-stt.ts"]
        }
      ]
    },
    {
      "name": "audio.speeches",
      "status": "beta",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "text": "string",
            "voice": "string (voice ID or model)",
            "response_format": "string (optional, e.g. 'url'|'base64')",
            "model": "string (if required)"
          },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/guides/text-to-speech"],
          "examples": ["file://examples/audio-tts.ts"]
        }
      ]
    },
    {
      "name": "files",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": { "file": "File|Buffer|ReadableStream", "purpose": "string" },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/files/upload"],
          "examples": ["file://examples/files-upload-and-use.ts"]
        },
        {
          "name": "list",
          "import_path": "openai",
          "params": {},
          "streaming": false,
          "errors": ["APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/files/list"],
          "examples": []
        },
        {
          "name": "retrieve",
          "import_path": "openai",
          "params": { "file_id": "string" },
          "streaming": false,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/api-reference/files/retrieve"],
          "examples": []
        },
        {
          "name": "download",
          "import_path": "openai",
          "params": { "file_id": "string" },
          "streaming": false,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/api-reference/files/retrieve-content"],
          "examples": []
        },
        {
          "name": "delete",
          "import_path": "openai",
          "params": { "file_id": "string" },
          "streaming": false,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/api-reference/files/delete"],
          "examples": []
        }
      ]
    },
    {
      "name": "fineTuning.jobs",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "model": "string",
            "training_file": "string (file ID)",
            "validation_file": "string (optional)",
            "hyperparams": "object (optional, e.g. n_epochs, batch_size)",
            "suffix": "string (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/fine-tuning"],
          "examples": ["file://examples/files-upload-and-use.ts"]
        },
        {
          "name": "list",
          "import_path": "openai",
          "params": { "limit": "number (optional)", "status": "string (optional)" },
          "streaming": true,
          "errors": ["APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/fine-tuning/list"],
          "examples": []
        },
        {
          "name": "retrieve",
          "import_path": "openai",
          "params": { "job_id": "string" },
          "streaming": false,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/api-reference/fine-tuning/retrieve"],
          "examples": []
        },
        {
          "name": "cancel",
          "import_path": "openai",
          "params": { "job_id": "string" },
          "streaming": false,
          "errors": ["ConflictError"],
          "docs": ["https://platform.openai.com/docs/api-reference/fine-tuning/cancel"],
          "examples": []
        },
        {
          "name": "listEvents",
          "import_path": "openai",
          "params": { "job_id": "string" },
          "streaming": true,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/api-reference/fine-tuning/events"],
          "examples": []
        }
      ]
    },
    {
      "name": "embeddings",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "model": "string",
            "input": "string | string[]",
            "user": "string (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/embeddings"],
          "examples": ["file://examples/embeddings.ts"]
        }
      ]
    },
    {
      "name": "moderations",
      "status": "stable",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "input": "string | string[]",
            "model": "string (optional, e.g. 'text-moderation-latest')"
          },
          "streaming": false,
          "errors": ["APIError"],
          "docs": ["https://platform.openai.com/docs/api-reference/moderations"],
          "examples": []
        }
      ]
    },
    {
      "name": "batches.jobs",
      "status": "beta",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "file_id": "string",
            "function": "string (e.g. 'chat.completions' or 'embeddings')",
            "model": "string",
            "results_format": "string (optional, e.g. 'jsonl')",
            "webhook_url": "string (optional)",
            "n": "number (optional, for completions)",
            "temperature": "number (optional, for completions)",
            "...": "other endpoint-specific params"
          },
          "streaming": false,
          "errors": ["BadRequestError", "APIError"],
          "docs": ["https://platform.openai.com/docs/guides/batch"],
          "examples": ["file://examples/batch-job.ts"]
        },
        {
          "name": "retrieve",
          "import_path": "openai",
          "params": { "batch_id": "string" },
          "streaming": false,
          "errors": ["NotFoundError"],
          "docs": ["https://platform.openai.com/docs/guides/batch#check-status"],
          "examples": ["file://examples/batch-job.ts"]
        },
        {
          "name": "cancel",
          "import_path": "openai",
          "params": { "batch_id": "string" },
          "streaming": false,
          "errors": ["ConflictError"],
          "docs": ["https://platform.openai.com/docs/guides/batch#cancel"],
          "examples": []
        },
        {
          "name": "list",
          "import_path": "openai",
          "params": { "limit": "number (optional)", "status": "string (optional)" },
          "streaming": true,
          "errors": [],
          "docs": ["https://platform.openai.com/docs/guides/batch#list-batches"],
          "examples": []
        }
      ]
    },
    {
      "name": "assistants",
      "status": "preview",
      "methods": [
        {
          "name": "create",
          "import_path": "openai",
          "params": {
            "name": "string",
            "description": "string (optional)",
            "instructions": "string",
            "model": "string",
            "tools": "array (optional, e.g. [{type: 'web_search'}, ...])",
            "files": "array of file_ids (optional)",
            "metadata": "object (optional)"
          },
          "streaming": false,
          "errors": ["BadRequestError"],
          "docs": ["https://platform.openai.com/docs/guides/assistants"],
          "examples": []
        },
        {
          "name": "threads.create",
          "import_path": "openai",
          "params": { "assistant_id": "string", "metadata": "object (optional)" },
          "streaming": false,
          "errors": ["BadRequestError"],
          "docs": ["https://platform.openai.com/docs/guides/assistants#threads"],
          "examples": ["file://examples/assistants-v2-thread-run.ts"]
        },
        {
          "name": "runs.create",
          "import_path": "openai",
          "params": { "thread_id": "string", "input": "string|object", "response_format": "string (optional)", "tools": "array (optional)" },
          "streaming": false,
          "errors": ["BadRequestError"],
          "docs": ["https://platform.openai.com/docs/guides/assistants#runs"],
          "examples": ["file://examples/assistants-v2-thread-run.ts"]
        },
        {
          "name": "threads.messages.list",
          "import_path": "openai",
          "params": { "thread_id": "string" },
          "streaming": false,
          "errors": ["APIError"],
          "docs": ["https://platform.openai.com/docs/guides/assistants#retrieve-messages"],
          "examples": []
        }
      ]
    },
    {
      "name": "realtime",
      "status": "preview",
      "methods": [
        {
          "name": "OpenAIRealtimeWebSocket",
          "import_path": "openai/realtime/websocket",
          "params": { "model": "string (e.g. 'gpt-realtime')", "params": "object (optional, e.g. {voice: 'voice_id'})" },
          "streaming": true,
          "errors": ["APIConnectionError"],
          "docs": ["https://platform.openai.com/docs/guides/realtime"],
          "examples": ["file://examples/realtime-ws.ts"]
        }
      ]
    },
    {
      "name": "webhooks",
      "status": "stable",
      "methods": [
        {
          "name": "verifySignature",
          "import_path": "openai",
          "params": { "body": "string|Buffer", "headers": "Headers|Record<string,string>" },
          "streaming": false,
          "errors": ["AuthenticationError"],
          "docs": ["https://platform.openai.com/docs/guides/webhooks"],
          "examples": []
        },
        {
          "name": "unwrap",
          "import_path": "openai",
          "params": { "body": "string|Buffer", "headers": "Headers|Record<string,string>" },
          "streaming": false,
          "errors": ["AuthenticationError"],
          "docs": ["https://platform.openai.com/docs/guides/webhooks"],
          "examples": ["file://examples/batch-job.ts"]
        }
      ]
    }
  ],
  "features": {
    "streaming": true,
    "file_uploads": true,
    "images": true,
    "audio_tts": true,
    "audio_stt": true,
    "embeddings": true,
    "moderations": true,
    "assistants_v2": true,
    "batch": true,
    "fine_tuning": true,
    "realtime": "preview",
    "video_generation": "not_documented"
  },
  "errors": {
    "classes": [
      "APIError",
      "BadRequestError",
      "AuthenticationError",
      "PermissionDeniedError",
      "NotFoundError",
      "ConflictError",
      "RateLimitError",
      "InternalServerError",
      "APIConnectionError",
      "APIConnectionTimeoutError",
      "UnprocessableEntityError"
    ],
    "notes": "Error classes correspond to HTTP status codes and connection issues:contentReference[oaicite:158]{index=158}:contentReference[oaicite:159]{index=159}. Use instanceof checks for specific handling. All extend OpenAI.APIError."
  },
  "rate_limits": {
    "noted_in_docs": true,
    "strategy": "exponential_backoff",
    "headers": [
      "Retry-After",
      "X-Ratelimit-Limit-requests",
      "X-Ratelimit-Remaining-requests",
      "X-Ratelimit-Reset-requests"
    ],
    "docs": [
      "https://platform.openai.com/docs/guides/rate-limits",
      "https://help.openai.com/en/articles/5951791"
    ]
  }
}
How to Use This Package Internally Install the OpenAI SDK and run the provided examples to jumpstart integration:
Install Package: In your Node.js project, add the SDK:
npm install openai
Ensure Node 18+ is used for native fetch support.
Set Environment Variables: Export your API credentials and any settings:
export OPENAI_API_KEY="sk-..."       # (required) 
export OPENAI_ORGANIZATION="org-..." # (optional)
export OPENAI_PROJECT="project-id"   # (optional, for multi-project orgs)
export OPENAI_WEBHOOK_SECRET="..."   # (optional, if using webhooks)
If running examples locally, you can put these in a .env file and use dotenv.
Run Examples: Navigate to the examples directory and execute TypeScript files using tsx or ts-node:
npx tsx examples/client-setup.ts
npx tsx examples/responses-basic.ts
npx tsx examples/tools-and-json.ts
npx tsx examples/images-generate.ts
npx tsx examples/audio-stt.ts
npx tsx examples/audio-tts.ts
npx tsx examples/files-upload-and-use.ts
npx tsx examples/embeddings.ts
npx tsx examples/assistants-v2-thread-run.ts   # if applicable to your key
npx tsx examples/batch-job.ts
npx tsx examples/realtime-ws.ts
Each example prints to console. Adjust paths or parameters (like file names) as needed for your environment.
Incorporate into Your Project: Use the patterns from these examples in your application code. For instance, initialize a single OpenAI client (as shown in client-setup.ts) and reuse it. Implement streaming handling as shown in responses-basic.ts for sending real-time updates to clients.
Project Structure Suggestion:
your-project/
  src/
    openai.ts          # (optional) wrapper module initializing OpenAI client
    routes/            # your API routes or controllers
    ...
  examples/            # copy the provided examples here for reference or testing
    client-setup.ts
    responses-basic.ts
    tools-and-json.ts
    images-generate.ts
    audio-stt.ts
    audio-tts.ts
    files-upload-and-use.ts
    embeddings.ts
    assistants-v2-thread-run.ts
    batch-job.ts
    realtime-ws.ts
Having a dedicated openai.ts that exports a configured client can help avoid repetition.
Running in Production: Remove or secure example scripts. Ensure only server environments have access to the API key. Monitor logs and token usage. Adjust maxRetries and timeout in OpenAI config as appropriate for your use case (e.g., a user-facing HTTP request might set a lower timeout than the default 10 minutes).
Copy the relevant example code into your codebase and adapt as needed. The examples serve as a reliable starting point for each feature, already aligned with official docs and best practices.
Citations

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Extend configuration to accept OpenAI organization and project · Issue #74 · openai/codex · GitHub

https://github.com/openai/codex/issues/74

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq
GitHub
openai.json

https://github.com/MyLife-Services/mylife-maht/blob/c91be66a7cbd3f6338e5ede0143c62aacda5a98e/inc/json-schemas/openai/openai.json#L144-L153
GitHub
openai.json

https://github.com/MyLife-Services/mylife-maht/blob/c91be66a7cbd3f6338e5ede0143c62aacda5a98e/inc/json-schemas/openai/openai.json#L156-L164
GitHub
openai.json

https://github.com/MyLife-Services/mylife-maht/blob/c91be66a7cbd3f6338e5ede0143c62aacda5a98e/inc/json-schemas/openai/openai.json#L80-L89

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Structured model outputs - OpenAI API

https://platform.openai.com/docs/guides/structured-outputs

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Model - OpenAI API

https://platform.openai.com/docs/models/sora-2

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Using GPT-5 - OpenAI API

https://platform.openai.com/docs/guides/latest-model

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Questions about tool changes in npm openai package from version ...

https://community.openai.com/t/questions-about-tool-changes-in-npm-openai-package-from-version-4-27-0-to-4-37-0/726572

Releases · openai/openai-node - GitHub

https://github.com/openai/openai-node/releases

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

Assistants API (v2) FAQ | OpenAI Help Center

https://help.openai.com/en/articles/8550641-assistants-api-v2-faq

Batch API FAQ | OpenAI Help Center

https://help.openai.com/en/articles/9197833-batch-api-faq

Your feedback requested: Node.js SDK 5.0.0 alpha

https://community.openai.com/t/your-feedback-requested-node-js-sdk-5-0-0-alpha/1063774

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node

GitHub - openai/openai-node: Official JavaScript / TypeScript library for the OpenAI API

https://github.com/openai/openai-node
All Sources

github

help.openai

platform.openai

community.openai