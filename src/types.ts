export interface Profile {
    id: string;
    name: string;
    lastRun: number;
    totalRuns: number;
    selected?: boolean;
}

export interface Login {
    username?: string;
    token?: string;
}
