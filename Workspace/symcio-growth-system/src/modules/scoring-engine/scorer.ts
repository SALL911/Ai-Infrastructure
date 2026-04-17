export class BrandScorer {
    private score: number;
    private scoreDetails: ScoreDetails;

    constructor() {
        this.score = 0;
        this.scoreDetails = {
            criteria: [],
            totalScore: 0,
        };
    }

    calculateScore(data: unknown): number {
        this.score = this.analyzeData(data);
        this.scoreDetails.totalScore = this.score;
        return this.score;
    }

    getScoreDetails(): ScoreDetails {
        return this.scoreDetails;
    }

    private analyzeData(_data: unknown): number {
        return Math.random() * 100;
    }
}

export interface Score {
    value: number;
    criteria: string[];
}

export interface ScoreDetails {
    criteria: string[];
    totalScore: number;
}
