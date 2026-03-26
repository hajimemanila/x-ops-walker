export interface GlobalState {
    walkerMode: boolean;
    blockOneTap: boolean;
    safetyEnter: boolean;
}

// 【追加】違反4解消: x-timeline.tsからパージされる設定群を統合した型定義
export interface XWalkerConfig {
    enabled: boolean;
    rightColumnDashboard: boolean;
    skipReposts: boolean;
    skipAds: boolean;
    scrollOffset: number;
    colors: {
        recent: string;
        old: string;
        ancient: string;
        copied: string;
    };
    zenOpacity: number;
}

export interface GeminiWalkerConfig {
    enabled: boolean;
}

export interface PhantomState {
    master: boolean;
    xWalker: XWalkerConfig; // 【修正】インライン定義から独立したインターフェースへ変更
    geminiWalker: GeminiWalkerConfig; // 【v2.3追加】Gemini Walker プロトコル設定
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
        rightColumnDashboard: true,
        // 【追加】違反4解消: デフォルト値のハードコード排除
        skipReposts: true,
        skipAds: true,
        scrollOffset: -150,
        colors: {
            recent: '#00ba7c',
            old: '#ffd400',
            ancient: '#f4212e',
            copied: 'rgba(0, 255, 255, 0.2)'
        },
        zenOpacity: 0.5
    },
    // 【v2.3追加】Gemini Walker デフォルト設定
    geminiWalker: {
        enabled: true,
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