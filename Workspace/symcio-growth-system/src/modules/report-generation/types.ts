export type ReportData = {
    summary: string;
    details: unknown[];
};

export type Report = {
    title: string;
    data: unknown;
    generatedAt: Date;
};
