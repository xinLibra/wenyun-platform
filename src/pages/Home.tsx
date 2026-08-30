import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BranchDivider, MeanderDivider, CloudDivider, WaveDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { InkIcon, InkCard, InkReveal } from '../components/ui/InkIcon'
import { HeroLogo } from '../components/ui/HeroLogo'
import { Auth } from '../components/auth/Auth'
import { supabase } from '../lib/supabase'

const craftCategories = [
  {
    id: 'dye',
    name: '染织工艺',
    description: '以染、织、印等技法制作纹样的传统工艺',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20calico%20dyeing%20pattern%20with%20floral%20designs%20indigo%20blue%20on%20white%20fabric&image_size=square',
    subcategories: ['蓝印花布', '扎染', '蜡染'],
    history: '中国染织工艺历史悠久，早在新石器时代就已出现。蓝印花布以靛蓝为染料，用木板雕刻图案进行防染印花，是最具代表性的民间染织技艺之一。',
    region: '江苏南通、浙江桐乡、湖南邵阳等地是蓝印花布的主要产地，扎染以云南大理最为著名，蜡染则在贵州、广西等地广为流传。'
  },
  {
    id: 'embroidery',
    name: '刺绣工艺',
    description: '以针线在织物上绣制图案的装饰艺术',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20embroidery%20silk%20fabric%20intricate%20flower%20and%20bird%20pattern%20gold%20thread%20elegant&image_size=square',
    subcategories: ['苏绣', '湘绣', '蜀绣', '粤绣'],
    history: '刺绣工艺始于商周，盛于唐宋。中国四大名绣各有特色：苏绣精细雅洁，湘绣写实生动，蜀绣色彩鲜艳，粤绣华丽繁复。',
    region: '苏绣以苏州为中心，湘绣以长沙为中心，粤绣以广州为中心，蜀绣以成都为中心，形成了各具特色的刺绣流派。'
  },
  {
    id: 'brocade',
    name: '织锦工艺',
    description: '以彩色丝线织成图案的高档丝织品',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20brocade%20silk%20fabric%20colorful%20pattern%20gold%20and%20silver%20threads%20luxurious&image_size=square',
    subcategories: ['云锦', '蜀锦', '壮锦'],
    history: '织锦工艺历史悠久，汉代蜀锦已闻名天下。南京云锦以其富丽堂皇的色彩和精湛的织造技艺被誉为"东方瑰宝"。',
    region: '云锦产于江苏南京，蜀锦产于四川成都，壮锦是广西壮族的传统工艺，各有独特的地域风格。'
  },
  {
    id: 'carving',
    name: '雕刻工艺',
    description: '以刀、凿等工具在材料上雕刻图案的技艺',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20papercut%20art%20red%20intricate%20double%20happiness%20pattern%20folk%20art%20style&image_size=square',
    subcategories: ['剪纸', '木雕', '砖雕', '石雕'],
    history: '剪纸是最具代表性的民间雕刻艺术，起源于汉代，以剪刀或刻刀为工具，在纸上剪刻出各种图案，是中国最古老的民间艺术之一。',
    region: '剪纸艺术遍布全国各地，陕西剪纸粗犷豪放，河北剪纸精美细腻，广东剪纸华丽繁复，各有特色。'
  },
  {
    id: 'ceramic',
    name: '陶瓷工艺',
    description: '在陶瓷器物上绘制或雕刻纹样的装饰技艺',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20and%20white%20porcelain%20pattern%20flower%20design%20elegant%20traditional&image_size=square',
    subcategories: ['青花瓷', '粉彩', '钧瓷'],
    history: '青花瓷始于唐代，成熟于元代，以钴蓝料在白瓷上绘制图案，色泽清新典雅。景德镇青花瓷更是闻名于世，被誉为"瓷都"。',
    region: '江西景德镇是青花瓷的主要产地，河南禹州的钧瓷以其独特的窑变效果著称，粉彩瓷则以景德镇最为著名。'
  },
  {
    id: 'metal',
    name: '金属工艺',
    description: '在金属器物上铸造或錾刻纹样的传统技艺',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20bronze%20vessel%20pattern%20taotie%20mask%20ancient%20Chinese%20art%20style&image_size=square',
    subcategories: ['青铜纹饰', '花丝镶嵌'],
    history: '青铜纹饰始于商周时期，以饕餮纹、云雷纹、夔龙纹等为代表，体现了古代先民的宗教信仰和审美观念。',
    region: '青铜文化以中原地区最为发达，河南安阳殷墟出土的青铜器纹饰最为精美，花丝镶嵌则以北京、成都等地最为著名。'
  },
]

const ethnicCategories = [
  {
    id: 'han',
    name: '汉族',
    description: '华夏文明的主体民族，纹样风格多样且体系完整',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20Han%20ethnic%20pattern%20elegant%20cloud%20and%20flower%20design%20red%20and%20gold&image_size=square',
    features: '汉族纹样注重对称和谐，题材广泛，包括云纹、花鸟、山水、吉祥图案等，体现了"天人合一"的哲学思想。'
  },
  {
    id: 'miao',
    name: '苗族',
    description: '以刺绣和银饰著称的少数民族',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20Miao%20ethnic%20embroidery%20pattern%20colorful%20geometric%20design%20folk%20art&image_size=square',
    features: '苗族纹样以刺绣为主，色彩鲜艳，图案夸张变形，充满原始生命力，多取材于自然万物和神话传说。'
  },
  {
    id: 'tibetan',
    name: '藏族',
    description: '融合宗教与自然元素的高原民族纹样',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Tibetan%20pattern%20mandala%20design%20colorful%20Buddhist%20symbols%20ethnic%20art&image_size=square',
    features: '藏族纹样受藏传佛教影响深远，以吉祥八宝、万字纹、莲花纹等为特色，色彩浓郁，寓意深远。'
  },
  {
    id: 'mongolian',
    name: '蒙古族',
    description: '以游牧文化为特色的草原民族纹样',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Mongolian%20pattern%20horse%20and%20cloud%20design%20blue%20and%20white%20nomadic%20style&image_size=square',
    features: '蒙古族纹样以卷草纹、云纹、马纹为特色，风格粗犷豪放，体现了草原民族的豪迈气概。'
  },
]

const themeCategories = [
  {
    id: 'geometric',
    name: '几何纹',
    description: '以线条与几何形构成的纹样，规整有序、秩序感强',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20geometric%20pattern%20huiwen%20meander%20gold%20and%20red%20ancient%20style&image_size=square',
    subcategories: ['回纹', '盘长纹', '锦地纹', '方胜纹'],
    meaning: '回纹回环往复，盘长寓意连绵不绝，锦地锦绣满铺，方胜方正得胜。'
  },
  {
    id: 'figure',
    name: '人物纹',
    description: '以人物形象为题材的纹样',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20figure%20pattern%20ancient%20scholars%20and%20beauties%20elegant%20painting%20style&image_size=square',
    subcategories: ['神话人物', '历史故事', '生活场景'],
    meaning: '人物纹多取材于神话传说、历史故事和日常生活，如八仙过海、嫦娥奔月等，具有丰富的叙事性。'
  },
]

const styleCategories = [
  {
    id: 'realism',
    name: '具象',
    opposite: '抽象',
    description: '纹样造型写实，注重细节刻画，力求逼真再现物象形态',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=realistic%20Chinese%20traditional%20flower%20pattern%20detailed%20petals%20and%20leaves%20naturalistic&image_size=square',
    oppositeImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20Chinese%20traditional%20pattern%20geometric%20shapes%20minimalist%20modern&image_size=square'
  },
  {
    id: 'traditional',
    name: '传统',
    opposite: '现代',
    description: '遵循传统美学规范，保留经典纹样的原始风貌和文化内涵',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20Chinese%20traditional%20pattern%20ancient%20style%20red%20and%20gold%20elegant&image_size=square',
    oppositeImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20Chinese%20pattern%20design%20contemporary%20minimal%20clean%20lines&image_size=square'
  },
  {
    id: 'complex',
    name: '繁复',
    opposite: '简约',
    description: '纹样层次丰富，细节繁多，呈现华丽饱满的视觉效果',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=intricate%20Chinese%20traditional%20pattern%20dense%20floral%20design%20rich%20details%20luxurious&image_size=square',
    oppositeImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimal%20Chinese%20pattern%20simple%20elegant%20clean%20design%20white%20space&image_size=square'
  },
  {
    id: 'handmade',
    name: '手作感',
    opposite: '数字科技感',
    description: '保留手工制作的肌理和质感，呈现自然质朴的艺术效果',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handmade%20Chinese%20traditional%20pattern%20textured%20brush%20strokes%20organic%20imperfections&image_size=square',
    oppositeImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20Chinese%20pattern%20futuristic%20geometric%20tech%20style%20glowing%20lines&image_size=square'
  },
]

const works = [
  { id: 1, title: '牡丹花开', author: '设计师小王', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20peony%20flower%20pattern%20blue%20and%20white%20ceramic%20style%20elegant&image_size=square' },
  { id: 2, title: '年年有余', author: '非遗传承人', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20fish%20pattern%20papercut%20style%20red%20and%20gold%20festive&image_size=square' },
  { id: 3, title: '山水之间', author: '艺术爱好者', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20landscape%20pattern%20ink%20wash%20style%20minimal%20elegant&image_size=square' },
  { id: 4, title: '吉祥如意', author: '文创设计师', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20auspicious%20cloud%20pattern%20embroidery%20style%20colorful&image_size=square' },
  { id: 5, title: '回纹四方', author: '设计师小李', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20huiwen%20meander%20geometric%20pattern%20gold%20and%20red%20elegant&image_size=square' },
  { id: 6, title: '凤舞九天', author: '艺术工作室', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20traditional%20phoenix%20pattern%20embroidery%20style%20colorful%20elegant&image_size=square' },
]

const comparisonData = [
  {
    traditionalTitle: '传统蓝印花布',
    traditionalImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20calico%20fabric%20vintage%20texture%20classic%20pattern&image_size=square',
    aiTitle: 'AI创新设计',
    aiImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20Chinese%20blue%20calico%20pattern%20redesign%20AI%20generated%20contemporary%20style&image_size=square',
    description: '传统蓝印花布纹样规整对称，AI在保留传统韵味的基础上融入现代审美，让经典纹样焕发新生。'
  },
  {
    traditionalTitle: '传统剪纸',
    traditionalImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20papercut%20red%20classic%20intricate%20design%20folk%20art&image_size=square',
    aiTitle: 'AI再创作',
    aiImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20Chinese%20papercut%20art%20AI%20innovation%20creative%20redesign%20contemporary&image_size=square',
    description: '传统剪纸工艺复杂耗时，AI能够快速生成多样化的剪纸风格纹样，同时保持剪纸艺术的镂空美感。'
  },
]

export default function Home() {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]))
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('section').forEach((section) => {
      observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth?.getSession()
      setIsLoggedIn(!!session?.user)
    }
    checkAuth()
  }, [])

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-rice-paper via-rice-paper-light to-rice-paper-dark opacity-100" />
        <div className="absolute inset-0 bg-ink-wash opacity-25" />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center px-4"
        >
          <div className="inline-block mb-6">
            <HeroLogo animation="ink-spread" />
          </div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className="font-shufa text-5xl md:text-7xl text-deep-blue mb-4 drop-shadow-sm"
          >
            {['A', 'I', '非', '遗', '纹', '样', '设', '计', '平', '台'].map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, x: -30, skewX: -10 }}
                animate={{ opacity: 1, x: 0, skewX: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: 0.4 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="inline-block"
              >
                {char === 'A' || char === 'I' ? (
                  <span className="font-song font-bold text-deep-blue">{char}</span>
                ) : (
                  char
                )}
              </motion.span>
            ))}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="font-song text-xl md:text-2xl text-deep-blue-light mb-8 max-w-2xl mx-auto"
          >
            传承千年非遗文化，用AI技术赋能创意设计
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/create">
              <StampButton>开始创作</StampButton>
            </Link>
            <Link to="/gallery">
              <Button variant="outline">浏览作品</Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-deep-blue/30 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-2 bg-deep-blue/50 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      <section id="craft" className={`py-20 px-4 transition-all duration-1000 ${visibleSections.has('craft') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">工艺分类</h2>
            <BranchDivider />
            <p className="font-song text-deep-blue-light mt-4">中国非遗纹样涵盖多种传统工艺，每种工艺都有独特的技法和美学特征</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {craftCategories.map((craft, index) => (
              <InkCard key={craft.id} delay={index * 0.1}>
                <Card bordered>
                  <div className="aspect-video bg-rice-paper-dark rounded-sm overflow-hidden mb-4">
                    <img src={craft.image} alt={craft.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-shufa text-xl text-deep-blue mb-2">{craft.name}</h3>
                    <p className="font-song text-sm text-deep-blue-light mb-3">{craft.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {craft.subcategories.map((sub) => (
                        <span key={sub} className="px-2 py-0.5 bg-deep-blue/10 text-deep-blue font-song text-xs rounded-sm">
                          {sub}
                        </span>
                      ))}
                    </div>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                      className="space-y-2 pt-3 border-t border-deep-blue-100"
                    >
                      <p className="font-song text-sm text-deep-blue-light leading-relaxed">{craft.history}</p>
                    </motion.div>
                  </div>
                </Card>
              </InkCard>
            ))}
          </div>
        </div>
      </section>

      <section id="ethnic" className={`py-20 px-4 bg-deep-blue-100/30 transition-all duration-1000 ${visibleSections.has('ethnic') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">族群/地域</h2>
            <MeanderDivider />
            <p className="font-song text-deep-blue-light mt-4">不同族群拥有独特的文化传统，纹样风格各具特色</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ethnicCategories.map((ethnic, index) => (
              <InkCard key={ethnic.id} delay={index * 0.1}>
                <Card bordered className="text-center">
                  <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden mb-4">
                    <img src={ethnic.image} alt={ethnic.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2">{ethnic.name}</h3>
                  <p className="font-song text-sm text-deep-blue-light mb-3">{ethnic.description}</p>
                  <p className="font-song text-sm text-deep-blue-light leading-relaxed">{ethnic.features}</p>
                </Card>
              </InkCard>
            ))}
          </div>
        </div>
      </section>

      <section id="theme" className={`py-20 px-4 transition-all duration-1000 ${visibleSections.has('theme') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">纹样题材</h2>
            <CloudDivider />
            <p className="font-song text-deep-blue-light mt-4">纹样题材丰富多样，承载着丰富的文化内涵和吉祥寓意</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {themeCategories.map((theme, index) => (
              <InkCard key={theme.id} delay={index * 0.1}>
                <Card bordered>
                  <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden mb-4">
                    <img src={theme.image} alt={theme.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2">{theme.name}</h3>
                  <p className="font-song text-sm text-deep-blue-light mb-3">{theme.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {theme.subcategories.map((sub) => (
                      <span key={sub} className="px-2 py-0.5 bg-palace-red/10 text-palace-red font-song text-xs rounded-sm">
                        {sub}
                      </span>
                    ))}
                  </div>
                  <p className="font-song text-sm text-deep-blue-light leading-relaxed">{theme.meaning}</p>
                </Card>
              </InkCard>
            ))}
          </div>
        </div>
      </section>

      <section id="style" className={`py-20 px-4 bg-deep-blue-100/30 transition-all duration-1000 ${visibleSections.has('style') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">风格倾向</h2>
            <WaveDivider />
            <p className="font-song text-deep-blue-light mt-4">非遗纹样可以从多个维度进行风格划分，体现不同的审美取向</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {styleCategories.map((style, index) => (
              <InkCard key={style.id} delay={index * 0.1}>
                <Card bordered>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="font-shufa text-lg text-palace-red">{style.name}</span>
                    <span className="text-deep-blue-light">↔</span>
                    <span className="font-shufa text-lg text-deep-blue">{style.opposite}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="relative">
                      <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                        <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs font-song text-center py-0.5 rounded-sm">
                        {style.name}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                        <img src={style.oppositeImage} alt={style.opposite} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs font-song text-center py-0.5 rounded-sm">
                        {style.opposite}
                      </div>
                    </div>
                  </div>
                  <p className="font-song text-sm text-deep-blue-light text-center">{style.description}</p>
                </Card>
              </InkCard>
            ))}
          </div>
        </div>
      </section>

      <section id="comparison" className={`py-20 px-4 bg-deep-blue-100/30 transition-all duration-1000 ${visibleSections.has('comparison') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">传统与创新</h2>
            <MeanderDivider />
            <p className="font-song text-deep-blue-light mt-4">AI赋能非遗纹样，传统与现代的碰撞融合</p>
          </div>

          {comparisonData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="mb-12"
            >
              <FrameDecorations className="bg-rice-paper-light p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                        <img src={item.traditionalImage} alt={item.traditionalTitle} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-palace-red text-rice-paper text-sm font-shufa rounded-sm">
                        传统纹样
                      </div>
                    </div>
                    <h3 className="font-shufa text-xl text-deep-blue mt-6">{item.traditionalTitle}</h3>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-ming-yellow/20 border-2 border-ming-yellow flex items-center justify-center shadow-md">
                      <span className="font-shufa text-2xl text-deep-blue">VS</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                        <img src={item.aiImage} alt={item.aiTitle} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-deep-blue text-rice-paper text-sm font-shufa rounded-sm">
                        AI创新
                      </div>
                    </div>
                    <h3 className="font-shufa text-xl text-deep-blue mt-6">{item.aiTitle}</h3>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="font-song text-deep-blue-light">{item.description}</p>
                </div>
              </FrameDecorations>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="works" className={`py-20 px-4 transition-all duration-1000 ${visibleSections.has('works') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">精选作品</h2>
            <CloudDivider />
            <p className="font-song text-deep-blue-light mt-4">欣赏来自设计师们的优秀创作（演示数据）</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work, index) => (
              <InkReveal key={work.id} delay={index * 0.1} direction="up">
                <Card hover bordered>
                  <div className="aspect-square bg-rice-paper-dark mb-4 overflow-hidden relative">
                    <img src={work.image} alt={work.title} className="w-full h-full object-cover" />
                    <motion.div 
                      className="absolute inset-0 bg-palace-red/20 opacity-0"
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <h3 className="font-shufa text-lg text-deep-blue mb-1">{work.title}</h3>
                  <p className="font-song text-sm text-deep-blue-light">作者: {work.author}</p>
                  <div className="mt-2 flex items-center gap-1 text-palace-red">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="font-song text-sm">精选</span>
                  </div>
                </Card>
              </InkReveal>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/gallery">
              <Button variant="secondary">查看更多作品</Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className={`py-20 px-4 transition-all duration-1000 ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-4xl mx-auto">
          <FrameDecorations className="bg-rice-paper-light p-8 md:p-12">
            <div className="text-center">
              <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-4">平台特色</h2>
              <p className="font-song text-deep-blue-light mb-6">AI 赋能非遗纹样，一站式完成生成、融合与产品定制</p>
              <WaveDivider />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <InkIcon variant="seal" size="lg" delay={0}>
                    生
                  </InkIcon>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2 mt-4">主题化智能生成</h3>
                  <p className="font-song text-deep-blue-light">覆盖花卉、几何纹等主题，支持牡丹、莲花、梅花、回纹、盘长纹、锦地纹、方胜纹等子类。结合颜色、文化符号强度等预设参数，生成可直接用于设计的传统纹样。</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <InkIcon variant="ink" size="lg" delay={0.1}>
                    荐
                  </InkIcon>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2 mt-4">场景智能推荐</h3>
                  <p className="font-song text-deep-blue-light">输入「毕业」「新婚」等使用场景，系统自动推荐匹配的纹样子类并勾选相关参数，降低专业门槛，一句话即可得到方案。</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <InkIcon variant="brush" size="lg" delay={0.2}>
                    融
                  </InkIcon>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2 mt-4">纹样融合与定制</h3>
                  <p className="font-song text-deep-blue-light">支持两个子类按比例融合，并可指定主题色。生成结果可一键应用到手机壳、书签、托特包、抱枕等产品，支持 2D/3D 预览、部件换色与贴图区域控制。</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <InkIcon variant="scroll" size="lg" delay={0.3}>
                    享
                  </InkIcon>
                  <h3 className="font-shufa text-xl text-deep-blue mb-2 mt-4">衍生与分享</h3>
                  <p className="font-song text-deep-blue-light">支持作品保存与展示、海报生成（含二维码、Logo、模板背景），以及 DNA 雷达图从文化强度、传统度等维度解读纹样，方便分享与二次创作。</p>
                </motion.div>
              </div>

              <p className="font-song text-sm text-deep-blue-light mt-8">完整演示加购、购物车与订单流程（演示环境，不含真实支付）</p>
            </div>
          </FrameDecorations>
        </div>
      </section>

      {!isLoggedIn && (
        <section id="cta" className={`py-20 px-4 bg-palace-red/5 transition-all duration-1000 ${visibleSections.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-shufa text-3xl md:text-4xl text-deep-blue mb-8">立即开始您的非遗设计之旅</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" onClick={() => setIsAuthModalOpen(true)}>免费注册</Button>
              <Link to="/about">
                <Button variant="outline" size="lg">了解更多</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

    <AnimatePresence>
      {isAuthModalOpen && (
        <Auth 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={() => {}}
        />
      )}
    </AnimatePresence>
    </>
  )
}
