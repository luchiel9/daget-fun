export type DagetType = 'fixed' | 'random' | 'raffle';

export function getOgModeLabel(dagetType: DagetType): string {
    switch (dagetType) {
        case 'fixed': return 'Fixed';
        case 'raffle': return 'Raffle';
        default: return 'Random';
    }
}

export type OgStats =
    | { label: string; value: string }
    | { label: string; value: string; secondaryLabel: string; secondaryValue: string };

export function getOgStatsLabel(
    dagetType: DagetType,
    claimedCount: number,
    totalWinners: number,
): OgStats {
    if (dagetType === 'raffle') {
        return {
            label: 'Entries',
            value: String(claimedCount),
            secondaryLabel: 'Winners',
            secondaryValue: String(totalWinners),
        };
    }
    return {
        label: 'Claimed',
        value: `${claimedCount} / ${totalWinners}`,
    };
}
