export type Query = {
    id: string;
    text: string;
    createdAt: Date;
};

export type AIResponse = {
    queryId: string;
    responseText: string;
    confidenceScore: number;
    generatedAt: Date;
};
