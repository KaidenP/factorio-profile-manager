export interface Profile {
    id: string;
    name: string;
    lastRun: number;
    totalRuns: number;
    version?: string;
    selected?: boolean;
}

export interface Login {
    username?: string;
    token?: string;
}

export interface StoredLogin {
    id: string;
    username: string;
    token: string;
    selected?: boolean;
}
