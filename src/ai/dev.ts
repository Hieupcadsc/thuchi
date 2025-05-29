import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-expense-categories.ts';
import '@/ai/flows/chat-with-spending-flow.ts'; // New chatbot flow
