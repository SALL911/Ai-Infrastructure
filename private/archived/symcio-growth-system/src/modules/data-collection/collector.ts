import { Query, AIResponse } from './types';

class DataCollector {
    private queries: Query[] = [];

    collectQuery(query: Query): void {
        this.queries.push(query);
    }

    async fetchAIResponse(query: string): Promise<AIResponse> {
        return {
            queryId: query,
            responseText: `AI response for: ${query}`,
            confidenceScore: 0,
            generatedAt: new Date(),
        };
    }

    getCollectedQueries(): Query[] {
        return this.queries;
    }
}

export { DataCollector };
