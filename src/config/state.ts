export interface GlobalState {
    walkerMode: boolean;
    blockOneTap: boolean;
    safetyEnter: boolean;
}

export interface PhantomState {
    master: boolean;
    xWalker: {
        enabled: boolean;
        rightColumnDashboard: boolean;
    };
}

export interface AlmConfig {
    enabled: boolean;
    excludeDomains: string[];
}

export const DEFAULT_GLOBAL_STATE: GlobalState = {
    walkerMode: true,
    blockOneTap: false,
    safetyEnter: false
};

export const DEFAULT_PHANTOM_STATE: PhantomState = {
    master: true,
    xWalker: {
        enabled: true,
        rightColumnDashboard: true
    }
};

export const DEFAULT_ALM_CONFIG: AlmConfig = {
    enabled: true,
    excludeDomains: [
        'x.com',
        'twitter.com',
        'gemini.google.com',
        'chatgpt.com',
        'claude.ai',
        'chat.deepseek.com',
        'copilot.microsoft.com',
        'perplexity.ai',
        'grok.com',
        'figma.com',
        'canva.com',
        'notion.so',
        'www.youtube.com',
    ]
};