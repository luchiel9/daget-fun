import React from 'react';

interface SpotlightCardProps extends React.PropsWithChildren {
    className?: string;
    spotlightColor?: string;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
    children,
    className = '',
    spotlightColor = 'rgba(255, 255, 255, 0.25)'
}) => {
    return (
        <div
            className={`card-spotlight-static ${className}`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                ['--spotlight-color' as string]: spotlightColor,
            }}
        >
            {children}
        </div>
    );
};

export default SpotlightCard;
