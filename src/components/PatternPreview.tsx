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
  textSize?: number;
  textPositionX?: number;
  textPositionY?: number;
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
  textSize = 16,
  textPositionX = 50,
  textPositionY = 85,
}) => {
  const sizeConfig = {
    small: {
      containerSize: 'w-24 h-24',
      productSize: 'w-14 h-auto',
      patternSize: 'w-12 h-12',
      offsetMultiplier: 0.5,
      textScale: 0.35,
    },
    medium: {
      containerSize: 'w-48 h-64',
      productSize: 'w-32 h-auto',
      patternSize: 'w-28 h-28',
      offsetMultiplier: 1.5,
      textScale: 0.75,
    },
    large: {
      containerSize: 'w-64 h-85',
      productSize: 'w-48 h-auto',
      patternSize: 'w-40 h-40',
      offsetMultiplier: 2,
      textScale: 1,
    },
  };

  const config = sizeConfig[size];

  // tile / band 属于「纹样贴在产品上」：作为产品图的背景平铺，
  // 产品图用 multiply 混合叠加，让产品轮廓与明暗透出，而不是把产品盖成一块平面纹样
  const isTileOrBand = layoutMode === 'tile' || layoutMode === 'band';

  const renderPattern = () => {
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
        <div
          className="relative"
          style={
            isTileOrBand
              ? {
                  backgroundImage: `url(${patternImage})`,
                  backgroundSize:
                    layoutMode === 'band' ? `${scale / 4}% 20%` : `${scale / 2}%`,
                  backgroundRepeat: layoutMode === 'band' ? 'repeat-x' : 'repeat',
                  backgroundPosition: layoutMode === 'band' ? `0 ${positionY - 10}%` : 'center',
                  transform: `rotate(${rotation}deg)`,
                }
              : undefined
          }
        >
          <img
            src={productImage}
            alt="产品"
            className={`${config.productSize} object-contain`}
            style={isTileOrBand ? { mixBlendMode: 'multiply' } : undefined}
          />
        </div>
      </div>

      {!isTileOrBand && renderPattern()}
      
      {textOverlay && (
        <div
          className="absolute px-2 py-1 text-center"
          style={{
            fontFamily: textFont === 'shufa' ? 'Ma Shan Zheng, cursive' :
                      textFont === 'song' ? 'Noto Serif SC, serif' :
                      textFont === 'hei' ? 'Noto Sans SC, sans-serif' : 'KaiTi, serif',
            fontSize: `${textSize * config.textScale}px`,
            color: '#1a1a2e',
            left: `${textPositionX}%`,
            top: `${textPositionY}%`,
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {textOverlay}
        </div>
      )}
    </div>
  );
};

export default PatternPreview;
