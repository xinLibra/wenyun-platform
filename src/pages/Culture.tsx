import { motion } from 'framer-motion'
import { BranchDivider, MeanderDivider } from '../components/decorations/IceCrackDivider'

const floralPatterns = [
  { name: '牡丹纹', form: '花冠饱满、花瓣层叠，常以团花或折枝形式组织。', meaning: '富贵、繁荣与吉祥' },
  { name: '莲花纹', form: '以莲瓣、莲蓬和舒展叶片构成，可形成放射式或对称式纹样。', meaning: '清雅、纯洁与和合' },
  { name: '梅花纹', form: '以五瓣花形和疏朗枝干为特征，适合单独纹样与连续排布。', meaning: '坚韧、高洁与迎春' },
  { name: '菊花纹', form: '花瓣细密并围绕花心放射展开，轮廓规整而富有层次。', meaning: '长寿、淡泊与高雅' },
  { name: '兰花纹', form: '叶片修长舒展，花朵轻盈，构图多强调曲线和留白。', meaning: '高洁、典雅与君子品格' },
  { name: '芙蓉花纹', form: '花瓣宽展、层次柔和，常以盛放花形表现圆润舒展的视觉效果。', meaning: '美好、纯洁与富贵' },
  { name: '石榴花纹', form: '以钟形花冠、翻卷花瓣和枝叶组合，色彩表现通常较为鲜明。', meaning: '繁盛、喜庆与生命力' },
]

const geometricPatterns = [
  { name: '回纹', form: '由横竖折线连续回转构成，可形成边饰、带状或四方连续结构。', meaning: '绵延不断、循环往复' },
  { name: '盘长纹', form: '以交错穿插的线带构成闭合结构，讲究路径连贯与上下叠压关系。', meaning: '连绵长久、圆满相续' },
  { name: '锦地纹', form: '通过菱格、多边形或交织单元密集铺陈，形成规整丰富的底纹。', meaning: '锦绣繁盛、秩序和谐' },
  { name: '方胜纹', form: '由两个菱形交叠或相连构成，可作为中心纹样或连续组合单元。', meaning: '同心相合、吉祥美满' },
]

const craftKnowledge = [
  {
    name: '蓝印花布',
    image: '/images/heritage/blue-calico-floral-bird.jpg',
    imageAlt: '蓝印花布花鸟纹实物',
    description: '以纹版和防染浆形成留白，再经靛蓝染色呈现蓝白纹样。常见题材包括花鸟、瑞果与几何边饰，布局多采用对称和连续组织。',
    tags: ['靛蓝防染', '蓝白对比', '连续布局'],
  },
  {
    name: '传统刺绣',
    image: '/images/heritage/traditional-embroidery-phoenix.png',
    imageAlt: '凤凰花卉刺绣实物',
    description: '通过针线在织物上塑造轮廓、色阶和肌理。花卉纹样常利用长短针、套针等方式表现花瓣层次，并结合枝叶形成疏密有致的画面。',
    tags: ['针线造型', '色阶层次', '花卉题材'],
  },
  {
    name: '蜀锦织造',
    image: '/images/heritage/shu-brocade-chengdu.png',
    imageAlt: '成都博物馆藏蜀锦织物实物',
    description: '以经纬组织和多色丝线织出复杂纹样，图案与织物结构同步形成。连续单元、对称骨架和锦地组织是理解传统几何纹样的重要参考。',
    tags: ['经纬组织', '多色丝线', '锦地纹样'],
  },
  {
    name: '佛山剪纸',
    image: '/images/heritage/foshan-paper-cutting.jpg',
    imageAlt: '佛山花卉蝴蝶剪纸实物',
    description: '以剪、刻形成虚实相间的镂空结构，讲究线线相连和外轮廓完整。花卉、蝴蝶等题材常经过概括变形，形成鲜明的平面装饰效果。',
    tags: ['剪刻镂空', '虚实对比', '平面造型'],
  },
  {
    name: '青花瓷纹饰',
    image: '/images/heritage/porcelain-flowers-birds.jpg',
    imageAlt: '博物馆藏青花花鸟纹瓷盘实物',
    description: '以含钴青料在瓷胎上绘制纹饰，再施透明釉高温烧成。盘、碗等器物常以中心主题纹配合边缘连续纹，形成主次分明的适合纹样。',
    tags: ['釉下青花', '器形适配', '中心与边饰'],
  },
  {
    name: '建筑木雕',
    image: '/images/heritage/qing-carved-wood-panels.jpg',
    imageAlt: '清代建筑木雕花板实物',
    description: '通过浮雕、透雕等方法在木构件上形成花卉与几何纹饰。门窗花板尤其强调重复单元、穿插关系和结构强度，兼具装饰与空间分隔功能。',
    tags: ['浮雕透雕', '门窗花板', '几何骨架'],
  },
]

function PatternKnowledgeCard({ name, form, meaning }: { name: string; form: string; meaning: string }) {
  return (
    <article className="border-t-2 border-deep-blue bg-rice-paper-light p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-shufa text-2xl text-deep-blue">{name}</h3>
        <span className="shrink-0 border border-palace-red/30 px-2 py-1 font-song text-xs text-palace-red">当前可生成</span>
      </div>
      <p className="mt-4 font-song leading-7 text-deep-blue-light">{form}</p>
      <div className="mt-4 border-l-2 border-ming-yellow pl-3">
        <span className="font-song text-xs text-deep-blue-light">文化寓意</span>
        <p className="mt-1 font-song text-sm text-deep-blue">{meaning}</p>
      </div>
    </article>
  )
}

export default function Culture() {
  return (
    <div className="min-h-screen bg-rice-paper px-4 py-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
          <p className="font-song text-sm text-palace-red">PATTERN KNOWLEDGE</p>
          <h1 className="mt-3 font-shufa text-4xl text-deep-blue md:text-5xl">传统纹样知识库</h1>
          <BranchDivider />
          <p className="mt-5 font-song leading-8 text-deep-blue-light">
            围绕平台当前支持的花卉与几何主题，了解各类纹样的造型特征、组织方式和文化寓意。知识资料用于辅助理解和创作，不代表生成结果会复刻特定传统工艺。
          </p>
          <nav className="mt-7 flex flex-wrap justify-center gap-3 font-song text-sm">
            <a href="#floral" className="border border-deep-blue-100 px-4 py-2 text-deep-blue transition hover:border-palace-red hover:text-palace-red">花卉纹样</a>
            <a href="#geometric" className="border border-deep-blue-100 px-4 py-2 text-deep-blue transition hover:border-palace-red hover:text-palace-red">几何纹样</a>
            <a href="#craft" className="border border-deep-blue-100 px-4 py-2 text-deep-blue transition hover:border-palace-red hover:text-palace-red">工艺参考</a>
          </nav>
        </motion.header>

        <motion.section id="floral" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="scroll-mt-24 pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <img src="/images/heritage/theme-floral-reference.jpg" alt="传统花卉纹样资料图" className="aspect-[4/3] w-full object-cover" />
            <div>
              <p className="font-song text-sm text-palace-red">01 / FLORAL</p>
              <h2 className="mt-2 font-shufa text-4xl text-deep-blue">花卉纹样知识</h2>
              <MeanderDivider />
              <p className="mt-5 font-song leading-8 text-deep-blue-light">
                花卉纹样常从花冠、花瓣、枝叶等自然形态中提炼轮廓，再通过对称、旋转、团花或连续排布形成装饰结构。平台目前支持以下七类花卉母题。
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {floralPatterns.map((pattern) => <PatternKnowledgeCard key={pattern.name} {...pattern} />)}
          </div>
        </motion.section>

        <motion.section id="geometric" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="scroll-mt-24 pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-song text-sm text-palace-red">02 / GEOMETRIC</p>
              <h2 className="mt-2 font-shufa text-4xl text-deep-blue">几何纹样知识</h2>
              <MeanderDivider />
              <p className="mt-5 font-song leading-8 text-deep-blue-light">
                几何纹样强调线条转折、单元重复、交叠关系与整体秩序，可通过单独纹样、边饰和四方连续等方式组织。平台目前支持以下四类几何母题。
              </p>
            </div>
            <img src="/images/heritage/theme-geometric-reference.png" alt="传统几何纹样资料图" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {geometricPatterns.map((pattern) => <PatternKnowledgeCard key={pattern.name} {...pattern} />)}
          </div>
        </motion.section>

        <motion.section id="craft" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="scroll-mt-24 pt-20">
          <div className="border-y border-deep-blue-100 py-9">
            <p className="font-song text-sm text-palace-red">03 / CRAFT KNOWLEDGE</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-shufa text-4xl text-deep-blue">传统工艺知识</h2>
              <p className="max-w-2xl font-song leading-7 text-deep-blue-light">通过真实馆藏与工艺实物认识纹样如何依附于织物、纸张、陶瓷和木构件。以下图片均为真实资料图，不是 AI 生成图。</p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {craftKnowledge.map((craft) => (
              <article key={craft.name} className="overflow-hidden border border-deep-blue-100 bg-rice-paper-light">
                <img src={craft.image} alt={craft.imageAlt} className="aspect-[4/3] w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-shufa text-2xl text-deep-blue">{craft.name}</h3>
                  <p className="mt-4 font-song leading-7 text-deep-blue-light">{craft.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {craft.tags.map((tag) => <span key={tag} className="border border-deep-blue-100 px-2.5 py-1 font-song text-xs text-deep-blue">{tag}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-6 border-l-2 border-palace-red pl-3 font-song text-sm leading-6 text-deep-blue-light">
            工艺知识用于理解传统纹样的材料与应用语境；平台当前生成能力仍聚焦花卉、几何及二者融合，不提供刺绣、织锦、剪纸等专项工艺风格生成。
          </p>
        </motion.section>
      </div>
    </div>
  )
}
