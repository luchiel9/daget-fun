interface ParticlesProps {
    particleCount?: number;
    particleSpread?: number;
    speed?: number;
    particleColors?: string[];
    alphaParticles?: boolean;
    particleBaseSize?: number;
    sizeRandomness?: number;
    cameraDistance?: number;
    disableRotation?: boolean;
    className?: string;
}

const Particles = ({ className }: ParticlesProps) => {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundImage:
                    'radial-gradient(circle at 15% 25%, rgba(79, 209, 237, 0.28) 0, transparent 28%), radial-gradient(circle at 80% 18%, rgba(209, 107, 165, 0.24) 0, transparent 32%), radial-gradient(circle at 65% 70%, rgba(110, 155, 138, 0.25) 0, transparent 35%)',
            }}
        />
    );
};

export default Particles;
