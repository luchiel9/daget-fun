import { logger } from '@/lib/logger';

const log = logger.child({ component: 'circuit-breaker' });

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failureCount = 0;
    private lastFailureAt = 0;
    private readonly failureThreshold: number;
    private readonly resetTimeoutMs: number;
    private readonly name: string;

    constructor(opts: { name: string; failureThreshold?: number; resetTimeoutMs?: number }) {
        this.name = opts.name;
        this.failureThreshold = opts.failureThreshold ?? 3;
        this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
    }

    get isOpen(): boolean {
        if (this.state === 'open') {
            // Check if reset timeout has elapsed → transition to half-open
            if (Date.now() - this.lastFailureAt >= this.resetTimeoutMs) {
                this.transition('half-open');
                return false;
            }
            return true;
        }
        return false;
    }

    recordSuccess(): void {
        if (this.state === 'half-open') {
            this.transition('closed');
        }
        this.failureCount = 0;
    }

    recordFailure(): void {
        this.failureCount++;
        this.lastFailureAt = Date.now();

        if (this.state === 'half-open') {
            this.transition('open');
        } else if (this.failureCount >= this.failureThreshold) {
            this.transition('open');
        }
    }

    private transition(newState: CircuitState): void {
        if (this.state !== newState) {
            log.info({ breaker: this.name, from: this.state, to: newState, failures: this.failureCount },
                'Circuit breaker state change');
            this.state = newState;
            if (newState === 'closed') {
                this.failureCount = 0;
            }
        }
    }
}
