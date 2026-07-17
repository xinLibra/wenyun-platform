import React from 'react';
import { motion } from 'framer-motion';

interface PatternPreviewProps {
  productImage: string;
  patternImage: string;
  scale: number;
  rotation: number;
  positionX: number;
  positionY: number;
  blendMode: string;
  size?: 'small' | 'medium' | 'large';
  showFrame?: boolean;
  layoutMode?: 'center' | 'tile' | 'corner' | 'band' | 'free';
  textOverlay?: string;
  textFont?: 'shufa' | 'song' | 'hei' | 'kai';
  textPosition?: 'bottom-center' | 'bottom-left' | 'bottom-right';
}

const PatternPreview: React.FC<PatternPreviewProps> = ({
  productImage,
  patternImage,
  scale,
  rotation,
  positionX,
  positionY,
  blendMode,
  size = 'medium',
  showFrame = true,
  layoutMode = 'free',
  textOverlay = '',
  textFont = 'shufa',
  textPosition = 'bottom-center',
}) => {
  const sizeConfig = {
    small: {
      containerSize: 'w-24 h-24',
      productSize: 'w-14 h-auto',
      patternSize: 'w-12 h-12',
      offsetMultiplier: 0.5,
    },
    medium: {
      containerSize: 'w-48 h-64',
      productSize: 'w-32 h-auto',
      patternSize: 'w-28 h-28',
      offsetMultiplier: 1.5,
    },
    large: {
      containerSize: 'w-64 h-85',
      productSize: 'w-48 h-auto',
      patternSize: 'w-40 h-40',
      offsetMultiplier: 2,
    },
  };

  const config = sizeConfig[size];

  const renderPattern = () => {
    if (layoutMode === 'band') {
      return (
        <div
          className="absolute"
          style={{
            left: `${(positionX - 50) * 0.8}%`,
            right: `${(50 - positionX) * 0.8}%`,
            top: `${positionY - 10}%`,
            height: '20%',
            backgroundImage: `url(${patternImage})`,
            backgroundSize: `${scale / 4}%`,
            backgroundRepeat: 'repeat-x',
            opacity: 0.7,
            mixBlendMode: blendMode as any,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        />
      );
    }

    if (layoutMode === 'tile') {
      return (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${patternImage})`,
            backgroundSize: `${scale / 2}%`,
            backgroundRepeat: 'repeat',
            opacity: 0.7,
            mixBlendMode: blendMode as any,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        />
      );
    }

    if (layoutMode === 'corner') {
      return (
        <div
          className="absolute"
          style={{
            left: '5%',
            top: '5%',
            width: '40%',
            height: '40%',
            backgroundImage: `url(${patternImage})`,
            backgroundSize: 'cover',
            opacity: 0.7,
            mixBlendMode: blendMode as any,
            transform: `rotate(${rotation}deg) scale(${scale / 200})`,
            transformOrigin: 'top left',
          }}
        />
      );
    }

    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          scale: scale / 100,
          rotate: rotation,
          x: (positionX - 50) * config.offsetMultiplier,
          y: (positionY - 50) * config.offsetMultiplier,
        }}
        style={{
          transformOrigin: 'center center',
          mixBlendMode: blendMode as any,
        }}
      >
        <img
          src={patternImage}
          alt="纹样"
          className={`${config.patternSize} object-cover`}
          style={{ opacity: 0.7 }}
        />
      </motion.div>
    );
  };

  return (
    <div className={`relative ${config.containerSize} bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden`}>
      {showFrame && (
        <div className="absolute inset-0 bg-ink-wash opacity-10" />
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <img
            src={productImage}
            alt="产品"
            className={`${config.productSize} object-contain`}
          />
          {(layoutMode === 'tile' || layoutMode === 'band') && renderPattern()}
        </div>
      </div>

      {(layoutMode !== 'tile' && layoutMode !== 'band') && renderPattern()}
      
      {textOverlay && (
        <div
          className={`absolute bottom-2 left-2 right-2 px-2 py-1 bg-rice-paper/80 backdrop-blur-sm rounded-sm ${
            textPosition === 'bottom-center' ? 'text-center' :
            textPosition === 'bottom-left' ? 'text-left' : 'text-right'
          }`}
          style={{
            fontFamily: textFont === 'shufa' ? 'Ma Shan Zheng, cursive' :
                      textFont === 'song' ? 'Noto Serif SC, serif' :
                      textFont === 'hei' ? 'Noto Sans SC, sans-serif' : 'KaiTi, serif',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            color: '#1a1a2e',
          }}
        >
          {textOverlay}
        </div>
      )}
    </div>
  );
};

export default PatternPreview;
