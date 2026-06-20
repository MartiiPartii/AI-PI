# AGENTS.md

## Project Overview

This project is a phone-based early screening service for Parkinson's disease risk. Users call a dedicated phone number and speak with an AI voice agent, which guides them through a short voice-based assessment. A machine learning model analyzes the voice sample and produces a Parkinson's disease risk score. If the result indicates elevated risk, the agent advises the caller to see a doctor for a clinical diagnosis. After the call, the system sends the caller an SMS summarizing their result. If the caller's phone number is linked to a registered account on the companion website, the result is also saved to their account history for later viewing.

The risk model is trained on the [Oxford Parkinson's Disease Detection Dataset](https://www.kaggle.com/datasets/pypiahmad/oxford-parkinsons-disease-detection-dataset) from Kaggle.

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
- **Training data:** Oxford Parkinson's Disease Detection Dataset (Kaggle)
- **Database:** shared store for user accounts (phone number-linked) and assessment result history

## Design Notes

- Services are independently deployable, communicating over internal APIs (microservice architecture).
- User accounts are keyed by phone number, so results from an anonymous call can be linked retroactively if the number matches an existing account.
- Risk results are communicated through two channels: spoken during the call, and in writing via SMS — and persisted only when an account exists for that number.