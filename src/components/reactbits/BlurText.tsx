/* eslint-disable @typescript-eslint/no-explicit-any */
type AnimationKeyframe = Record<string, any>;

interface BlurTextProps {
    text?: string;
    delay?: number;
    className?: string;
    animateBy?: 'words' | 'letters';
    direction?: 'top' | 'bottom';
    threshold?: number;
    rootMargin?: string;
    animationFrom?: AnimationKeyframe;
    animationTo?: AnimationKeyframe[];
    easing?: (t: number) => number;
    onAnimationComplete?: () => void;
    stepDuration?: number;
}

const BlurText = ({
    text = '',
    className = '',
    animateBy = 'words',
}: BlurTextProps) => {
    const elements = animateBy === 'words' ? text.split(' ') : text.split('');

    return (
        <p className={className} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {elements.map((segment, index) => {
                return (
                    <span className="inline-block" key={index}>
                        {segment === ' ' ? '\u00A0' : segment}
                        {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
                    </span>
                );
            })}
        </p>
    );
};

export default BlurText;
