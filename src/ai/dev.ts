
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-expense-categories.ts';
import '@/ai/flows/chat-with-spending-flow.ts';
import '@/ai/flows/extract-bill-info-flow.ts'; // Added new bill extraction flow
