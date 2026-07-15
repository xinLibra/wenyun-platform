import { motion } from 'framer-motion'
import { BranchDivider, CloudDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'

export default function Platform() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4">平台介绍</h1>
          <BranchDivider />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <FrameDecorations className="bg-rice-paper-light p-8 md:p-12">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-6">纹韵 - AI非遗纹样设计平台</h2>
            <CloudDivider />
            
            <div className="space-y-6 mt-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="font-shufa text-xl text-palace-red mb-3 flex items-center">
                  <span className="w-2 h-2 bg-palace-red rounded-full mr-3" />
                  平台定位
                </h3>
                <p className="font-song text-deep-blue-light leading-relaxed">
                  纹韵是一个致力于传承和创新中国非物质文化遗产纹样的AI设计平台。我们结合深度学习技术与传统美学，为设计师、文创从业者和非遗爱好者提供智能化的纹样生成与定制服务。
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="font-shufa text-xl text-palace-red mb-3 flex items-center">
                  <span className="w-2 h-2 bg-palace-red rounded-full mr-3" />
                  核心功能
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-rice-paper p-4 rounded-sm border border-deep-blue-100">
                    <div className="w-12 h-12 bg-palace-red/10 rounded-sm flex items-center justify-center mb-3">
                      <span className="font-shufa text-palace-red text-2xl">创</span>
                    </div>
                    <h4 className="font-shufa text-deep-blue mb-1">AI纹样生成</h4>
                    <p className="font-song text-sm text-deep-blue-light">基于Stable Diffusion XL模型，支持多种非遗风格的智能生成</p>
                  </div>
                  <div className="bg-rice-paper p-4 rounded-sm border border-deep-blue-100">
                    <div className="w-12 h-12 bg-ming-yellow/20 rounded-sm flex items-center justify-center mb-3">
                      <span className="font-shufa text-deep-blue text-2xl">品</span>
                    </div>
                    <h4 className="font-shufa text-deep-blue mb-1">产品定制</h4>
                    <p className="font-song text-sm text-deep-blue-light">将生成的纹样应用于书签、手机壳、丝巾等多种文创产品</p>
                  </div>
                  <div className="bg-rice-paper p-4 rounded-sm border border-deep-blue-100">
                    <div className="w-12 h-12 bg-deep-blue/10 rounded-sm flex items-center justify-center mb-3">
                      <span className="font-shufa text-deep-blue text-2xl">展</span>
                    </div>
                    <h4 className="font-shufa text-deep-blue mb-1">作品展示</h4>
                    <p className="font-song text-sm text-deep-blue-light">汇聚优秀设计作品，打造非遗纹样交流社区</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="font-shufa text-xl text-palace-red mb-3 flex items-center">
                  <span className="w-2 h-2 bg-palace-red rounded-full mr-3" />
                  技术特色
                </h3>
                <ul className="space-y-2 font-song text-deep-blue-light">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>LoRA模型微调：针对蓝印花布、剪纸、刺绣等非遗风格进行专项训练</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>参数化控制：支持纹样复杂度、色彩、对称性等多维度调节</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>实时预览：产品定制时支持纹样大小、位置、角度的实时调节</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-block bg-rice-paper-light px-8 py-6 rounded-sm border border-deep-blue-100">
            <p className="font-shufa text-lg text-deep-blue mb-2">平台愿景</p>
            <p className="font-song text-deep-blue-light">让AI成为非遗文化传承的桥梁，让传统纹样在现代生活中焕发新生</p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}