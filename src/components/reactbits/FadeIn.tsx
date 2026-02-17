import { ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    distance?: number;
    duration?: number;
    className?: string;
}

const FadeIn = ({
    children,
    delay = 0,
    direction = 'up',
    distance = 30,
    duration = 0.6,
    className = '',
}: FadeInProps) => {
    const directionMap = {
        up: `translate3d(0, ${distance}px, 0)`,
        down: `translate3d(0, -${distance}px, 0)`,
        left: `translate3d(${distance}px, 0, 0)`,
        right: `translate3d(-${distance}px, 0, 0)`,
        none: 'translate3d(0, 0, 0)',
    } as const;

    return (
        <div
            className={className}
            style={{
                opacity: 0,
                transform: directionMap[direction],
                animationName: 'fade-in-up',
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
            }}
        >
            {children}
        </div>
    );
};

export default FadeIn;
