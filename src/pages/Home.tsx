import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Auth } from '../components/auth/Auth'
import { BranchDivider, CloudDivider, WaveDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { Button, StampButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { HeroLogo } from '../components/ui/HeroLogo'
import { PATTERN_THEMES } from '../data/patternTaxonomy'
import { supabase } from '../lib/supabase'

const themes = [
  {
    id: 'floral' as const,
    title: '花卉主题',
    description: '从牡丹、莲花、梅花等传统花卉母题出发，生成具有吉祥寓意的花卉纹样。',
    image: '/images/heritage/theme-floral-reference.jpg',
    tags: ['牡丹纹', '莲花纹', '梅花纹', '菊花纹'],
  },
  {
    id: 'geometric' as const,
    title: '几何主题',
    description: '从回纹、盘长、锦地、方胜等传统几何母题出发，生成规整有序的纹样。',
    image: '/images/heritage/theme-geometric-reference.png',
    tags: ['回纹', '盘长纹', '锦地纹', '方胜纹'],
  },
]

const knowledgeCards = [
  { title: '花卉纹样资料', text: '查阅牡丹、莲花、梅花等七类可生成花卉母题的造型与文化寓意。', image: '/images/heritage/theme-floral-reference.jpg', href: '/culture#floral', actionLabel: '查看花卉知识' },
  { title: '几何纹样资料', text: '了解回纹、盘长纹、锦地纹与方胜纹的构成方式和组织规律。', image: '/images/heritage/theme-geometric-reference.png', href: '/culture#geometric', actionLabel: '查看几何知识' },
  { title: '传统工艺知识', text: '通过蓝印花布、刺绣、织锦、剪纸、陶瓷与木雕实物认识纹样应用。', image: '/images/heritage/blue-calico-floral-bird.jpg', href: '/culture#craft', actionLabel: '查看工艺知识' },
]

const workflow = [
  ['01', '选择主题', '从花卉或几何主题进入，选择具体纹样子类。'],
  ['02', '调整参数', '控制复杂度、肌理、色彩、排布、对称方式与文化强度。'],
  ['03', '生成分析', '生成纹样，保存作品，并查看纹样 DNA 分析。'],
  ['04', '3D 定制', '将纹样应用到已有 3D 产品，调整贴图与部件颜色。'],
]

const products = [
  { id: 'bookmark', name: '书签', type: '文创', image: '/images/products/bookmark.jpg' },
  { id: 'phonecase', name: '手机壳', type: '文创', image: '/images/products/phonecase.jpg' },
  { id: 'tote', name: '手提袋', type: '文创', image: '/images/products/tote.jpg' },
  { id: 'cushion', name: '抱枕', type: '文创', image: '/images/products/cushion.jpg' },
  { id: 'tshirt', name: 'T恤', type: '服饰', image: '/images/products/tshirt.jpg' },
]

const examples = [
  { title: '花卉主题生成', meta: '牡丹纹 · 花卉', image: '/images/home/example-floral.png' },
  { title: '几何主题生成', meta: '回纹 · 几何', image: '/images/home/example-geometric.png' },
  { title: '双纹样融合', meta: '花卉与几何 · 权重融合', image: '/images/home/example-fusion.png' },
]

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth?.getSession().then(({ data }) => setIsLoggedIn(!!data.session?.user))
  }, [])

  return (
    <>
      <section className="relative overflow-hidden bg-rice-paper px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-ink-wash opacity-20" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <HeroLogo animation="ink-spread" />
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 font-song text-sm text-palace-red">
              AI 非遗纹样生成与 3D 文创定制
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 max-w-3xl font-shufa text-5xl leading-tight text-deep-blue md:text-7xl">
              从传统纹样出发，生成你的设计
            </motion.h1>
            <p className="mt-6 max-w-xl font-song text-lg leading-8 text-deep-blue-light">
              以花卉与几何两大主题为入口，结合传统资料、参数调节和 3D 产品预览，完成从灵感到应用的创作流程。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/create"><StampButton>开始生成</StampButton></Link>
              <Link to="/culture"><Button variant="outline">浏览知识库</Button></Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 font-song text-sm text-deep-blue-light">
              <span className="border-l-2 border-palace-red pl-3">花卉主题</span>
              <span className="border-l-2 border-deep-blue pl-3">几何主题</span>
              <span className="border-l-2 border-ming-yellow pl-3">3D 产品预览</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 overflow-hidden rounded-sm border border-deep-blue-100 bg-white shadow-sm">
              <img src="/images/heritage/theme-floral-reference.jpg" alt="传统花卉纹样参考图" className="h-72 w-full object-cover" />
              <div className="flex items-center justify-between px-5 py-4">
                <div><p className="font-shufa text-xl text-deep-blue">传统参考 · 花卉</p><p className="font-song text-sm text-deep-blue-light">资料图与 AI 结果分开呈现</p></div>
                <span className="font-song text-xs text-palace-red">REFERENCE</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-sm bg-deep-blue"><img src="/images/home/example-floral.png" alt="花卉主题生成示例" className="h-36 w-full object-cover" /><p className="px-4 py-3 font-song text-sm text-rice-paper">花卉主题生成</p></div>
            <div className="overflow-hidden rounded-sm bg-palace-red"><img src="/images/home/example-geometric.png" alt="几何主题生成示例" className="h-36 w-full object-cover" /><p className="px-4 py-3 font-song text-sm text-rice-paper">几何主题生成</p></div>
          </div>
        </div>
      </section>

      <section className="bg-rice-paper-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div><p className="font-song text-sm text-palace-red">01 / 主题入口</p><h2 className="mt-2 font-shufa text-4xl text-deep-blue">从两个主题开始</h2></div>
            <p className="max-w-md font-song leading-7 text-deep-blue-light">首页入口与生成页保持一致。选择子类后，主题和参数会直接带入创作页。</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {themes.map((theme) => (
              <Card key={theme.id} bordered className="overflow-hidden p-0">
                <div className="grid md:grid-cols-[0.8fr_1.2fr]">
                  <img src={theme.image} alt={`${theme.title}传统参考图`} className="h-64 w-full object-cover md:h-full" />
                  <div className="p-6 md:p-8">
                    <p className="font-song text-xs text-palace-red">{theme.id === 'floral' ? 'FLORAL' : 'GEOMETRIC'}</p>
                    <h3 className="mt-2 font-shufa text-3xl text-deep-blue">{theme.title}</h3>
                    <p className="mt-4 font-song leading-7 text-deep-blue-light">{theme.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {theme.tags.map((tag) => {
                        const sub = PATTERN_THEMES.find((item) => item.id === theme.id)?.subcategories.find((item) => item.label === tag)?.id || ''
                        return <Link key={tag} to={`/create?theme=${theme.id}&subcategory=${sub}`} className="border border-deep-blue-100 px-3 py-1.5 font-song text-sm text-deep-blue transition hover:border-palace-red hover:text-palace-red">{tag}</Link>
                      })}
                    </div>
                    <Link to={`/create?theme=${theme.id}`} className="mt-6 inline-flex font-song text-sm text-palace-red">进入{theme.title}生成 →</Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center"><p className="font-song text-sm text-palace-red">02 / 纹样知识库</p><h2 className="mt-2 font-shufa text-4xl text-deep-blue">传统资料用于理解，生成结果单独呈现</h2><BranchDivider /><p className="mx-auto mt-4 max-w-2xl font-song leading-7 text-deep-blue-light">知识库提供纹样母题、工艺与文化寓意资料；当前实际生成能力聚焦花卉、几何及二者融合。</p></div>
          <div className="grid gap-5 md:grid-cols-3">
            {knowledgeCards.map((item) => (
              <Card key={item.title} hover bordered className="overflow-hidden p-0">
                <img src={item.image} alt={`${item.title}传统资料图`} className="aspect-[4/3] w-full object-cover" />
                <div className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-shufa text-xl text-deep-blue">{item.title}</h3><span className="shrink-0 font-song text-xs text-palace-red">知识库资料</span></div><p className="mt-3 font-song leading-7 text-deep-blue-light">{item.text}</p><Link to={item.href} className="mt-4 inline-flex font-song text-sm text-palace-red">{item.actionLabel} →</Link></div>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center"><Link to="/culture"><Button variant="outline">进入完整知识库</Button></Link></div>
        </div>
      </section>

      <section className="bg-deep-blue-100/30 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl"><div className="mb-10"><p className="font-song text-sm text-palace-red">03 / 平台工作流</p><h2 className="mt-2 font-shufa text-4xl text-deep-blue">从主题到 3D 产品</h2><WaveDivider /></div><div className="grid gap-4 md:grid-cols-4">{workflow.map(([step, title, text]) => <div key={step} className="border-t-2 border-deep-blue bg-rice-paper-light p-5"><span className="font-song text-sm text-palace-red">{step}</span><h3 className="mt-5 font-shufa text-xl text-deep-blue">{title}</h3><p className="mt-3 font-song leading-7 text-deep-blue-light">{text}</p></div>)}</div></div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="font-song text-sm text-palace-red">04 / 3D 应用</p><h2 className="mt-2 font-shufa text-4xl text-deep-blue">把生成结果放进产品</h2></div><p className="max-w-md font-song leading-7 text-deep-blue-light">只展示已有 3D 模型的产品。进入定制页后，可继续调整贴图、位置、大小和颜色。</p></div><div className="grid grid-cols-2 gap-4 md:grid-cols-5">{products.map((product) => <Link key={product.id} to={`/customize?product=${product.id}`} className="group border border-deep-blue-100 bg-rice-paper-light p-3 transition hover:-translate-y-1 hover:border-palace-red"><div className="aspect-square overflow-hidden bg-white"><img src={product.image} alt={`${product.name}产品图`} className="h-full w-full object-contain p-2 transition group-hover:scale-105" /></div><div className="mt-3 flex items-center justify-between"><span className="font-shufa text-lg text-deep-blue">{product.name}</span><span className="font-song text-xs text-palace-red">{product.type}</span></div><span className="mt-2 block font-song text-xs text-deep-blue-light">进入 3D 定制 →</span></Link>)}</div></div>
      </section>

      <section className="bg-rice-paper-light px-4 py-16 md:py-20"><div className="mx-auto max-w-7xl"><div className="mb-10 text-center"><p className="font-song text-sm text-palace-red">05 / 创作示例</p><h2 className="mt-2 font-shufa text-4xl text-deep-blue">平台生成结果</h2><CloudDivider /></div><div className="grid gap-5 md:grid-cols-3">{examples.map((item) => <Card key={item.title} hover bordered className="overflow-hidden p-0"><img src={item.image} alt={item.title} className="aspect-square w-full object-cover" /><div className="p-5"><h3 className="font-shufa text-xl text-deep-blue">{item.title}</h3><p className="mt-2 font-song text-sm text-deep-blue-light">{item.meta}</p><span className="mt-4 inline-block border border-deep-blue-100 px-2 py-1 font-song text-xs text-deep-blue-light">AI 生成示例</span></div></Card>)}</div></div></section>

      <section className="px-4 py-16 md:py-20"><FrameDecorations className="mx-auto max-w-5xl bg-rice-paper-light p-8 md:p-12"><div className="text-center"><h2 className="font-shufa text-3xl text-deep-blue">开始你的纹样创作</h2><p className="mx-auto mt-4 max-w-xl font-song leading-7 text-deep-blue-light">选择花卉或几何主题，生成纹样，再将作品应用到已有 3D 产品中。</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/create"><StampButton>开始生成</StampButton></Link>{!isLoggedIn && <Button variant="outline" onClick={() => setIsAuthModalOpen(true)}>注册并保存作品</Button>}</div></div></FrameDecorations></section>

      <AnimatePresence>{isAuthModalOpen && <Auth onClose={() => setIsAuthModalOpen(false)} onLogin={() => setIsAuthModalOpen(false)} />}</AnimatePresence>
    </>
  )
}
