export type AuditResult = {
    score: number;
    details: string;
};

export type AuditData = {
    queries: string[];
    aiResponses: string[];
    report: string;
};
