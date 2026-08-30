import { motion } from 'framer-motion'
import { BranchDivider, CloudDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'

const faqs = [
  {
    question: '如何使用 AI 生成纹样？',
    answer: '1. 进入「创作纹样」页面；\n2. 选择主题与子类（如花卉-牡丹、几何-回纹等），或输入使用场景由系统推荐；\n3. 调节预设参数（颜色、文化符号强度等）；\n4. 点击「生成」，等待结果；\n5. 可多次生成，直到满意为止。',
  },
  {
    question: '如何将纹样应用到产品上？',
    answer: '1. 在创作页生成满意纹样后，进入「定制产品」；\n2. 选择目标产品（手机壳、书签、托特包、抱枕等）；\n3. 在预览中调整贴图区域、大小与部件颜色；\n4. 点击「加入购物车」或「立即购买」完成演示下单。',
  },
  {
    question: '生成的纹样是否可以商用？',
    answer: '本平台生成的纹样目前主要用于学习、展示与非商业用途。如需商用，请联系客服获取授权说明。我们尊重知识产权，鼓励原创设计。',
  },
  {
    question: '如何保存和分享我的作品？',
    answer: '1. 在作品展示中找到对应作品；\n2. 进入详情后可保存高清图；\n3. 支持生成海报（含二维码、Logo）并分享链接或下载。',
  },
  {
    question: '平台目前支持哪些纹样主题？',
    answer: '目前重点支持花卉、几何纹（回纹、盘长纹、锦地纹、方胜纹等）等主题与子类，并持续扩展更多传统纹样与风格。',
  },
  {
    question: '如何成为平台设计师？',
    answer: '注册并登录后，发布原创纹样作品即可参与展示。优秀作品将获得更多曝光机会与合作机会。',
  },
]

export default function Help() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4">帮助中心</h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">解答您使用过程中的疑问</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <FrameDecorations className="bg-rice-paper-light p-8">
            <h2 className="font-shufa text-2xl text-deep-blue mb-6">快速指南</h2>
            <CloudDivider />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-palace-red rounded-sm flex items-center justify-center mb-4">
                  <span className="font-shufa text-ming-yellow text-3xl">1</span>
                </div>
                <h3 className="font-shufa text-lg text-deep-blue mb-2">注册登录</h3>
                <p className="font-song text-sm text-deep-blue-light">注册账号并登录，开启您的纹样创作之旅</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-deep-blue rounded-sm flex items-center justify-center mb-4">
                  <span className="font-shufa text-rice-paper text-3xl">2</span>
                </div>
                <h3 className="font-shufa text-lg text-deep-blue mb-2">创作纹样</h3>
                <p className="font-song text-sm text-deep-blue-light">选择风格、输入描述、调节参数，生成专属纹样</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-ming-yellow rounded-sm flex items-center justify-center mb-4">
                  <span className="font-shufa text-deep-blue text-3xl">3</span>
                </div>
                <h3 className="font-shufa text-lg text-deep-blue mb-2">定制产品</h3>
                <p className="font-song text-sm text-deep-blue-light">将纹样应用到文创产品，打造专属定制</p>
              </div>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-shufa text-2xl text-deep-blue mb-6 text-center">常见问题</h2>
          <CloudDivider className="mb-8" />
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-rice-paper-light rounded-sm border border-deep-blue-100 overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 flex justify-between items-center font-shufa text-lg text-deep-blue hover:bg-rice-paper-dark/30 transition-colors"
                >
                  <span>{faq.question}</span>
                  <svg className="w-5 h-5 text-deep-blue-light transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="px-6 pb-4">
                  <p className="font-song text-deep-blue-light leading-relaxed whitespace-pre-line">{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-palace-red/5 px-8 py-6 rounded-sm border border-palace-red/20">
            <p className="font-shufa text-lg text-deep-blue mb-2">还有其他问题？</p>
            <p className="font-song text-deep-blue-light">请联系我们的客服团队：3684553782@qq.com</p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}