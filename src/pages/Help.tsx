import { motion } from 'framer-motion'
import { BranchDivider, CloudDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'

const faqs = [
  {
    question: '如何使用AI生成纹样？',
    answer: '1. 进入"创作纹样"页面；2. 选择非遗风格（蓝印花布、剪纸、刺绣、水墨等）；3. 输入描述词，描述您想要的纹样主题和风格；4. 调节参数（复杂度、色彩、对称性等）；5. 点击"生成"按钮，等待AI生成结果；6. 可多次生成直到满意为止。',
  },
  {
    question: '如何将纹样应用到产品上？',
    answer: '1. 在"创作纹样"页面生成满意的纹样后，点击"定制产品"；2. 选择目标产品（书签、手机壳、丝巾、笔记本、明信片、手提袋）；3. 选择产品材质；4. 在预览区域调节纹样的大小、位置和旋转角度；5. 点击"立即购买"或"加入购物车"完成定制。',
  },
  {
    question: '生成的纹样是否可以商用？',
    answer: '本平台生成的纹样仅供个人学习和非商业用途。如需商用，请联系平台客服获取授权。我们尊重知识产权，鼓励原创设计。',
  },
  {
    question: '如何保存和分享我的作品？',
    answer: '1. 在作品展示页面找到您的作品；2. 点击作品卡片进入详情页；3. 点击"保存"按钮下载高清图片；4. 点击"分享"按钮可分享到社交媒体或生成分享链接。',
  },
  {
    question: '平台支持哪些非遗风格？',
    answer: '目前平台支持蓝印花布、剪纸艺术、刺绣纹样、水墨风格四种非遗风格。我们正在持续扩展更多风格，敬请期待。',
  },
  {
    question: '如何成为平台设计师？',
    answer: '注册并登录平台后，发布您的原创纹样作品，即可成为平台设计师。优秀设计师将获得更多曝光机会和合作机会。',
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
            <p className="font-song text-deep-blue-light">请联系我们的客服团队：2710004138@qq.com</p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}