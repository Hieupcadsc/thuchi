import { startFlowServer } from '@genkit-ai/express';
import { extractBillInfo } from './flows/extract-bill-info-flow';
import { suggestExpenseCategories } from './flows/suggest-expense-categories';

startFlowServer({
  flows: [extractBillInfo, suggestExpenseCategories],
  port: 3400,
}); 