import { motion } from 'framer-motion'
import { BranchDivider, MeanderDivider, LotusDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'

const cultures = [
  {
    name: '蓝印花布',
    origin: '唐宋时期',
    region: '江苏南通、浙江桐乡',
    description: '蓝印花布是中国传统的民间印染工艺，以靛蓝染料印花而成。其图案多取材于民间传说、吉祥寓意和自然风光，具有浓郁的乡土气息和民族特色。蓝印花布的制作工艺包括刻板、刮浆、染色等多道工序，每一步都需要匠人的精心操作。',
    features: ['靛蓝色调', '花卉纹样', '对称构图'],
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20calico%20fabric%20pattern%20floral%20elegant&image_size=square',
  },
  {
    name: '剪纸艺术',
    origin: '南北朝时期',
    region: '陕西、山西、河北',
    description: '剪纸是中国最古老的民间艺术之一，通过剪刀或刻刀在纸上剪刻出各种图案。剪纸题材广泛，包括人物、动物、花卉、吉祥符号等，常用于节日装饰、婚丧嫁娶等场合。剪纸艺术讲究线条流畅、构图精巧，体现了中国民间艺人的高超技艺。',
    features: ['红色主调', '镂空技法', '民俗题材'],
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20papercut%20art%20red%20festive%20elegant&image_size=square',
  },
  {
    name: '刺绣纹样',
    origin: '新石器时代',
    region: '苏绣(苏州)、湘绣(长沙)、蜀绣(成都)、粤绣(广州)',
    description: '刺绣是中国传统的手工艺之一，以针线在织物上绣制各种图案。中国四大名绣——苏绣、湘绣、蜀绣、粤绣各具特色，针法丰富、色彩艳丽。刺绣纹样多取材于自然景物和吉祥图案，既实用又具有极高的艺术价值。',
    features: ['色彩丰富', '针法多样', '立体感强'],
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20embroidery%20pattern%20colorful%20elegant%20floral&image_size=square',
  },
  {
    name: '水墨风格',
    origin: '唐代',
    region: '全国',
    description: '水墨画是中国传统绘画的代表形式，以墨色的浓淡变化表现物象。水墨风格讲究"气韵生动"、"意在笔先"，追求意境和神韵。水墨纹样常以山水、花鸟、书法为题材，具有简洁、含蓄、空灵的艺术特点。',
    features: ['墨色变化', '意境深远', '留白艺术'],
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20wash%20painting%20pattern%20minimal%20elegant%20mountains&image_size=square',
  },
]

export default function Culture() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4">非遗文化</h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">探索中国非物质文化遗产纹样的魅力与内涵</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <FrameDecorations className="bg-rice-paper-light p-8 md:p-12">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-6">中国传统纹样概述</h2>
            <MeanderDivider />
            
            <p className="font-song text-deep-blue-light leading-relaxed mt-8">
              中国传统纹样是中华民族五千年文明的重要组成部分，承载着丰富的文化内涵和审美智慧。从新石器时代的彩陶纹样，到商周时期的青铜器纹饰，再到唐宋以来的织绣、陶瓷纹样，中国传统纹样经历了漫长的发展历程，形成了独特的艺术风格和体系。
            </p>
            
            <p className="font-song text-deep-blue-light leading-relaxed mt-4">
              传统纹样不仅是装饰艺术，更是文化传承的载体。每一种纹样都蕴含着特定的寓意和象征意义，如牡丹象征富贵吉祥，龙凤象征皇权与尊贵，蝙蝠象征福气，鱼象征年年有余等。这些纹样不仅反映了古人对美好生活的向往，也体现了中华民族独特的审美观念和哲学思想。
            </p>
          </FrameDecorations>
        </motion.section>

        <div className="space-y-8">
          {cultures.map((culture, index) => (
            <motion.div
              key={culture.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.15 }}
            >
              <FrameDecorations className="bg-rice-paper-light p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 flex-shrink-0">
                    <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                      <img src={culture.image} alt={culture.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="md:w-2/3">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-shufa text-2xl text-deep-blue">{culture.name}</h3>
                      <span className="px-3 py-1 bg-palace-red/10 text-palace-red font-song text-sm rounded-sm">非物质文化遗产</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mb-4 font-song text-sm">
                      <div className="flex items-center">
                        <span className="text-deep-blue-light mr-1">起源：</span>
                        <span className="text-deep-blue">{culture.origin}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-deep-blue-light mr-1">代表地域：</span>
                        <span className="text-deep-blue">{culture.region}</span>
                      </div>
                    </div>
                    
                    <p className="font-song text-deep-blue-light leading-relaxed mb-4">
                      {culture.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {culture.features.map((feature) => (
                        <span key={feature} className="px-3 py-1 bg-deep-blue/10 text-deep-blue font-song text-sm rounded-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FrameDecorations>
            </motion.div>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16"
        >
          <div className="text-center mb-10">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-4">纹样寓意</h2>
            <LotusDivider />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { symbol: '牡丹', meaning: '富贵吉祥' },
              { symbol: '龙凤', meaning: '尊贵权威' },
              { symbol: '蝙蝠', meaning: '福气满满' },
              { symbol: '鱼', meaning: '年年有余' },
              { symbol: '梅花', meaning: '坚韧不拔' },
              { symbol: '莲花', meaning: '纯洁高雅' },
              { symbol: '云纹', meaning: '吉祥如意' },
              { symbol: '回纹', meaning: '绵延不断' },
            ].map((item) => (
              <div key={item.symbol} className="bg-rice-paper-light p-4 rounded-sm border border-deep-blue-100 text-center">
                <span className="font-shufa text-xl text-palace-red">{item.symbol}</span>
                <p className="font-song text-sm text-deep-blue-light mt-1">{item.meaning}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}