# AGENTS.md

## Project Overview

This project is a phone-based early screening service for Parkinson's disease risk. Users call a dedicated phone number and speak with an AI voice agent, which guides them through a short voice-based assessment. A machine learning model analyzes the voice sample and produces a Parkinson's disease risk score. If the result indicates elevated risk, the agent advises the caller to see a doctor for a clinical diagnosis. After the call, the system sends the caller an SMS summarizing their result. If the caller's phone number is linked to a registered account on the companion website, the result is also saved to their account history for later viewing.

The final risk model is trained on the [Italian Parkinson's Voice and Speech dataset](https://huggingface.co/datasets/birgermoell/Italian_Parkinsons_Voice_and_Speech), using the raw audio downsampled to 8 kHz and phone-degraded so it matches the 8 kHz G.711 audio Twilio actually delivers. We previously prototyped on the Oxford and Istanbul (Sakar) Parkinson's datasets but moved off them — see `HACKATHON.md` (Q7) for how each was used and why they were dropped.

## Architecture

The system is built as three independent services:

1. **Website (Next.js)** — Public-facing site explaining the phone line and its purpose. Lets users create an account and associate it with their phone number. Provides a dashboard where users with an account can view their past assessment results.

2. **Telephony service (Node.js)** — Handles all Twilio webhooks: receives inbound calls, runs the AI voice agent's conversation flow, captures the caller's voice input, sends it to the AI model service for scoring, relays the risk result back to the caller during the call, and triggers the results SMS via Twilio. Also responsible for looking up whether the caller's number has a registered account and, if so, writing the result to the database.

3. **AI model service (FastAPI)** — Hosts the trained Parkinson's risk prediction model. Exposes an endpoint that accepts voice-derived features and returns a risk assessment, which the Node.js service consumes during the call.

These services communicate over internal APIs and share a database for storing user accounts and assessment results.

## Core Flow

1. User dials the phone line.
2. Twilio routes the call to the Node.js webhook service.
3. The AI voice agent greets the caller and walks them through the voice assessment (e.g. instructing them to speak in a specific way).
4. The recorded voice input is sent to the FastAPI model service for analysis.
5. The model returns a Parkinson's disease risk score/classification.
6. The Node.js service has the AI agent relay the result to the caller, recommending a doctor's visit if risk is high.
7. The Node.js service sends an SMS with the result summary via Twilio.
8. If the caller's number matches a registered account, the result is stored in the database and becomes visible on the user's dashboard on the Next.js website.

## Tech Stack

- **Frontend:** Next.js — info site, account creation, results dashboard
- **Telephony / orchestration:** Node.js — Twilio Voice (inbound calls) and Twilio Messaging (SMS), conversation logic for the AI voice agent
- **AI / ML inference:** FastAPI (Python) — serves the trained risk-prediction model
- **Training data:** Italian Parkinson's Voice and Speech dataset (Hugging Face), 8 kHz + phone-degraded (earlier prototypes used the Oxford and Istanbul/Sakar datasets — dropped; see `HACKATHON.md` Q7)
- **Database:** shared store for user accounts (phone number-linked) and assessment result history

## Development Rules

- **Dependencies must always be installed at their newest, latest stable version.** When adding a dependency, install the latest release (e.g. `npm install <pkg>@latest`); when working in a service, prefer keeping existing dependencies up to date as well. Do not pin to older versions unless a documented incompatibility requires it.

- **The Website (`web/`) follows a strict layered architecture, and every layer is documented by a `README.md` in its own directory** (`src/actions/`, `src/client/` — including `src/client/actions/` and `src/client/state/` — `src/components/`, `src/domain/`, `src/external/`, `src/lib/`, `src/schemas/`, and `src/services/`). These per-layer READMEs are authoritative:
  - **Always read the relevant layer's `README.md` before adding, moving, or changing code in that layer.** Each README defines the layer's purpose, what belongs in it, and how it may depend on the other layers.
  - **The layered architecture must always be followed.** Place new code in the layer whose README describes its responsibility, respect the dependency direction the READMEs prescribe, and never bypass a layer or blur its boundaries for convenience.
  - If a change does not fit cleanly into any layer as documented, update the relevant README to reflect the new boundary as part of the same change rather than violating the architecture — and prefer asking for verification when the correct layer is unclear.

## Website (`web/`) Engineering Standards

These standards are mandatory for all work in `web/` and apply on top of the per-layer READMEs above. They encode Next.js (App Router) best practices for this project.

- **Server-first rendering.** Default to React Server Components. A component may only become a Client Component (`'use client'`) when it genuinely needs the browser: interactivity, state/effects, event handlers, browser-only APIs, or animation. The actual content/data must be fetched and rendered on the server — never move real rendering to the client just to gain one interactive or animated detail.
- **Consistent SSR / static rendering.** Prefer static rendering (SSG) wherever the content allows; let routes be statically rendered by default and opt into dynamic rendering only when a request actually depends on per-request data. Do not introduce request-time dynamism (e.g. reading headers/cookies, `dynamic = 'force-dynamic'`, uncached fetches) unless the page truly requires it, and say why in the code. Fetch data in Server Components / the Services layer, not in client effects.
- **Thin client wrappers for animation.** Animated and interactive behaviour must live in **thin** Client Component wrappers that receive already-rendered content as `children` (or props) from a Server Component. The wrapper supplies only motion/interaction; the information itself is server-rendered and present in the initial HTML (so it works without JS and is crawlable). Never pull data fetching or business content into a `'use client'` component to animate it — wrap the server-rendered output instead.
- **shadcn/ui only for UI primitives.** All reusable UI primitives must come from **shadcn/ui** (generated into `src/components/ui` via the shadcn CLI) styled with Tailwind. Do not add other component libraries (MUI, Chakra, Ant, Radix-direct ad-hoc wrappers outside shadcn, etc.) and do not hand-roll primitives that shadcn already provides. Compose and extend shadcn components; keep the layered rules (no business logic in components) intact.
- **Design quality.** The UI must be clean, minimalist, and modern, taking cues from polished marketing/product sites such as Stripe: restrained palette, deliberate typography and spacing, generous whitespace, subtle purposeful motion. Use the `frontend-design` skill for aesthetic direction and avoid generic, templated "AI-looking" layouts. Accessibility is a floor, not an extra: keyboard focus, semantic markup, and `prefers-reduced-motion` must be respected.
- **Good abstractions & dependency direction.** Respect the one-way flow: `components` → `client/state` → `client/actions` → `actions` (Zod-validated) → `services` → `domain`/`external`, with `schemas` as the shared source of truth for types. Keep components presentational, push logic down into the layer the READMEs prescribe, and reuse rather than duplicate.
- **Dependencies stay latest.** Per the Development Rules above, keep `web/` dependencies at their latest stable versions. Tailwind is on v4 (CSS `@import 'tailwindcss'` + `@config` loading `tailwind.config.ts`); ESLint is held at the latest 9.x only because `eslint-config-next` does not yet support ESLint 10.
- **Verification.** Before considering `web/` work done, run `pnpm lint`, `pnpm typecheck`, and `pnpm build`, and confirm they pass. Use the `playwright` skill to screenshot and visually verify the rendered result against the clean/minimalist design bar.

## Experience & Real-Time Requirements

- **Real-time, in-call results.** The voice sample must be analysed *during the call* so the AI agent can tell the caller their risk result before hanging up (not only via the after-call SMS). This requires streaming the caller's audio to the model in near real time rather than waiting for a finished recording.
- **Target audience: non-technical and elderly callers.** The conversation must be patient, simple, and forgiving. The agent must handle callers who: ask it to repeat itself, don't understand the instructions, or say words/something other than the requested sustained vowel ("ahhh"). In those cases the agent must gently re-explain and let them try again, rather than failing the call.
- The telephony service runs a conversational voice agent over **Twilio Media Streams** (raw bidirectional audio). The conversation is driven by **OpenAI's GPT Realtime speech-to-speech API**: Twilio streams the caller's audio (8 kHz G.711 μ-law) to the Node.js server, which relays it over a WebSocket to the Realtime model and streams the model's audio responses back to the caller. This is chosen over a text-LLM-behind-ConversationRelay design to maximise conversational naturalness for elderly, non-technical callers.
- Because the server already terminates the raw audio stream, the caller's sustained-vowel ("ahhh") phonation is captured by teeing a copy of the inbound audio into a buffer, which is then sent to the FastAPI model service for scoring during the call.
- Requires an **OpenAI API key** for the Realtime API (in addition to the Twilio credentials).
- **Multilingual, Bulgarian by default.** The agent speaks Bulgarian on every new call. If a caller asks it to switch to another language (or addresses it in another language and asks), it switches and continues in that language for the rest of the call. This is driven by the agent's system instructions.

## Design Notes

- Services are independently deployable, communicating over internal APIs (microservice architecture).
- User accounts are keyed by phone number, so results from an anonymous call can be linked retroactively if the number matches an existing account.
- Risk results are communicated through two channels: spoken during the call, and in writing via SMS — and persisted only when an account exists for that number.