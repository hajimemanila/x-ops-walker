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