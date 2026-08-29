import { motion } from 'framer-motion'
import { BranchDivider, MeanderDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'

export default function Terms() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4">服务条款与隐私政策</h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">本平台为竞赛演示项目，仅用于学术展示</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <FrameDecorations className="bg-rice-paper-light p-8">
            <h2 className="font-shufa text-2xl text-deep-blue mb-6">免责声明</h2>
            <MeanderDivider />
            
            <div className="space-y-4 mt-8 font-song text-deep-blue-light leading-relaxed">
              <p>
                本平台（"纹韵"）是江南大学学生团队为参加竞赛而开发的演示项目，仅用于学术展示和技术交流目的。
              </p>
              <p>
                本平台所生成的纹样作品仅供个人学习和非商业用途。使用者不得将生成的作品用于商业目的，包括但不限于出售、分发、复制用于盈利等。
              </p>
              <p>
                本平台使用的AI模型基于公开的深度学习框架和数据集，生成的内容可能存在与现有作品相似的情况。如有侵权，请联系我们处理。
              </p>
              <p>
                本平台提供的产品定制功能为演示功能，实际购买流程和支付系统尚未完全实现。
              </p>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <FrameDecorations className="bg-rice-paper-light p-8">
            <h2 className="font-shufa text-2xl text-deep-blue mb-6">隐私政策</h2>
            <MeanderDivider />
            
            <div className="space-y-4 mt-8 font-song text-deep-blue-light leading-relaxed">
              <p>
                我们尊重并保护用户的隐私。本平台仅收集必要的用户信息，用于提供服务和改进产品。
              </p>
              <p>
                注册时收集的信息包括用户名、邮箱地址等，用于账户管理和身份验证。
              </p>
              <p>
                用户生成的纹样作品和操作记录可能会被用于平台展示和技术研究，但不会用于其他商业目的。
              </p>
              <p>
                我们不会向第三方出售或分享用户的个人信息。
              </p>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <FrameDecorations className="bg-rice-paper-light p-8">
            <h2 className="font-shufa text-2xl text-deep-blue mb-6">使用协议</h2>
            <MeanderDivider />
            
            <div className="space-y-4 mt-8 font-song text-deep-blue-light leading-relaxed">
              <p>
                用户在使用本平台时，应遵守相关法律法规和道德规范，不得利用本平台从事违法或有害活动。
              </p>
              <p>
                用户应对自己的账号和密码安全负责，如发现账号异常应及时联系我们。
              </p>
              <p>
                本平台有权根据实际情况修改服务条款和隐私政策，修改后的条款将在平台公告。
              </p>
              <p>
                如有任何疑问或建议，欢迎联系我们：3684553782@qq.com
              </p>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-palace-red/5 px-6 py-4 rounded-sm">
            <p className="font-song text-sm text-deep-blue-light">
              © 2026 纹韵. 本平台为竞赛演示项目，仅用于学术展示.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}