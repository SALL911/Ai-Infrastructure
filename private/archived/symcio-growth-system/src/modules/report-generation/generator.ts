export class ReportGenerator {
    private reportData: ReportData;

    constructor(reportData: ReportData) {
        this.reportData = reportData;
    }

    generateReport(): Report {
        const formattedData = this.formatReport();
        return {
            title: 'Brand AI Audit Report',
            data: formattedData,
            generatedAt: new Date(),
        };
    }

    formatReport(): unknown {
        return {
            summary: this.reportData.summary,
            details: this.reportData.details,
        };
    }
}

export interface Report {
    title: string;
    data: unknown;
    generatedAt: Date;
}

export interface ReportData {
    summary: string;
    details: unknown[];
}
