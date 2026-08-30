import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { BranchDivider, MeanderDivider, CloudDivider, LotusDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { Logo } from '../components/ui/Logo'

const teamMembers = [
  {
    name: '吴歆扬',
    identity: '队长',
    major: '江南大学人工智能专业',
    role: '系统开发与平台负责人',
    avatarColor: 'bg-palace-red',
    avatarText: '吴',
    description: '负责AI设计平台的系统架构设计、数据库设计，实现用户交互、模型调用、图片生成与产品映射等核心功能，并负责系统部署。专注于生成模型算法研究与应用落地。'
  },
  {
    name: '陈颖湘',
    identity: '队员',
    major: '江南大学人工智能专业',
    role: 'AI模型与数据负责人',
    avatarColor: 'bg-deep-blue',
    avatarText: '陈',
    description: '负责非遗纹样数据集采集与清洗、标注与数据增强，搭建Stable Diffusion XL + LoRA训练环境，完成多风格LoRA模型微调与融合策略研究，并输出算法实验报告。'
  },
  {
    name: '郜姗姗',
    identity: '队员',
    major: '江南大学人工智能专业',
    role: '产品验证负责人',
    avatarColor: 'bg-ming-yellow',
    avatarText: '郜',
    description: '负责产品模板体系建设、生成效果评价体系设计（纹样保真度、产品适配度、色彩协调性等维度），组织用户测试并形成商业可行性分析与推广方案。'
  },
]

const advisors = [
  {
    name: '张欣',
    title: '博士/副教授',
    department: '江南大学人工智能与计算机学院',
    avatarColor: 'bg-qing-green',
    avatarText: '张',
    research: '人工智能、计算智能及其应用',
    fullBio: '2020年6月获华南理工大学计算机科学与技术专业博士学位，同年7月加入江南大学，现任江南大学人工智能与计算机学院副教授。\n\n已在TEVC、TCYB等国内外权威期刊及会议发表论文20余篇。主持国家自然科学基金青年项目、江苏省双创博士人才计划项目。现为IEEE会员、中国人工智能学会（CAAI）会员、中国自动化学会（CAA）会员、中国计算机学会（CCF）会员，CCF TCCC协同计算专委会执行委员，担任多个国际权威期刊和会议的常用审稿人。'
  },
  {
    name: '牛犁',
    title: '教授/博士/博士生导师',
    department: '江南大学设计学院·社会科学处副处长',
    avatarColor: 'bg-cang-blue',
    avatarText: '牛',
    research: '服饰文化、服装设计',
    fullBio: '国家级青年人才，江南大学至善青年学者，教育部中华优秀传统文化传承基地（江南大学）主任，江苏省非物质文化遗产研究基地主任，中国艺术人类学学会刺绣专业委员会副主任委员兼秘书长，江苏省文化产业学会艺术创意产业专业委员会副主任。\n\n主持国家艺术基金项目、国家社科基金艺术学青年项目、教育部哲学社科重大项目（子课题）、江苏省社科基金项目等各级项目多项。曾获教育部高等学校科学研究优秀成果奖（人文社会科学）二等奖、江苏省哲学社会科学优秀成果二等奖（2项）、"纺织之光"中国纺织工业联合会纺织高等教育教学成果奖一、二等奖等。发表学术论文90余篇，其中30余篇被SCI、CSSCI、EI、CSCD、北大中文核心等数据库收录，被人大复印资料全文转载。'
  },
]

const techStack = [
  { name: '深度学习框架', description: 'PyTorch' },
  { name: '图像生成模型', description: 'Stable Diffusion + LoRA（可选 ControlNet）' },
  { name: '前端技术', description: 'React + TypeScript + Tailwind CSS' },
  { name: '状态管理', description: 'Zustand' },
  { name: '动画效果', description: 'Framer Motion' },
  { name: '数据库/认证', description: 'Supabase (PostgreSQL)' },
]

export default function About() {
  const [expandedAdvisors, setExpandedAdvisors] = useState<Set<string>>(new Set())

  const toggleAdvisor = (name: string) => {
    setExpandedAdvisors(prev => {
      const newSet = new Set(prev)
      newSet.has(name) ? newSet.delete(name) : newSet.add(name)
      return newSet
    })
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <Logo variant="hero" colorScheme="light" />
          </div>
          <h1 className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4">关于我们</h1>
          <BranchDivider />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <FrameDecorations className="bg-rice-paper-light p-8 md:p-12">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-6">项目背景</h2>
            <MeanderDivider />
            
            <div className="space-y-6 mt-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="font-shufa text-xl text-palace-red mb-3 flex items-center">
                  <span className="w-2 h-2 bg-palace-red rounded-full mr-3" />
                  为什么要做非遗纹样+AI？
                </h3>
                <p className="font-song text-deep-blue-light leading-relaxed">
                  中国非物质文化遗产蕴含着中华民族五千年文明的精髓，其中传统纹样更是承载着丰富的文化内涵和审美智慧。然而，随着时代的变迁，许多传统纹样技艺面临失传的困境，年轻一代对传统文化的认知也逐渐淡化。我们希望通过AI技术，让传统纹样焕发新生，让更多人能够便捷地接触、了解并创造非遗纹样作品。
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="font-shufa text-xl text-palace-red mb-3 flex items-center">
                  <span className="w-2 h-2 bg-palace-red rounded-full mr-3" />
                  项目愿景
                </h3>
                <p className="font-song text-deep-blue-light leading-relaxed">
                  我们致力于打造一个连接传统与现代的桥梁，让AI技术成为非遗文化传承与创新的工具。通过本平台，用户不仅能够欣赏和学习传统纹样文化，更能够利用AI技术创作出融合传统美学与现代设计的原创作品，实现非遗文化在当代生活中的创造性转化和创新性发展。
                </p>
              </motion.div>
            </div>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-4">技术方案</h2>
            <CloudDivider />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-rice-paper-light p-6 rounded-sm border border-deep-blue-100"
              >
                <h3 className="font-shufa text-lg text-deep-blue mb-2">{tech.name}</h3>
                <p className="font-song text-sm text-deep-blue-light">{tech.description}</p>
              </motion.div>
            ))}
          </div>

          <FrameDecorations className="bg-rice-paper-light p-6 mt-8">
            <h3 className="font-shufa text-xl text-deep-blue mb-4">核心算法</h3>
            <p className="font-song text-deep-blue-light leading-relaxed mb-4">
              我们的纹样生成基于扩散模型（Stable Diffusion），结合主题化 LoRA 与可控参数，实现对纹样题材、文化符号强度、配色等的调节。通过对传统纹样数据的学习，模型能够生成符合传统美学、又适合现代设计使用的纹样。
            </p>
            <ul className="space-y-3 font-song text-deep-blue-light">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                <span><strong className="text-deep-blue">主题与子类控制：</strong>支持花卉（牡丹、莲花、梅花等）、几何纹（回纹、盘长纹、锦地纹、方胜纹等）等题材的生成</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                <span><strong className="text-deep-blue">参数可控：</strong>支持颜色、文化符号强度、对称性等预设参数调节，便于快速得到可用结果</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                <span><strong className="text-deep-blue">场景推荐：</strong>根据使用场景（如毕业、新婚）自动推荐纹样子类与参数</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                <span><strong className="text-deep-blue">纹样融合：</strong>支持两个子类按比例融合，并继承主题色与参数</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-palace-red rounded-full mt-2 mr-2 flex-shrink-0" />
                <span><strong className="text-deep-blue">产品落地：</strong>生成纹样可应用到手机壳、书签、托特包、抱枕等，支持 2D/3D 预览与部件换色</span>
              </li>
            </ul>
          </FrameDecorations>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-4">团队成员</h2>
            <LotusDivider />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Card className="text-center p-6">
                  <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${member.avatarColor} flex items-center justify-center shadow-md`}>
                    <span className="font-shufa text-3xl text-rice-paper">{member.avatarText}</span>
                  </div>
                  <h3 className="font-shufa text-xl text-deep-blue mb-1">{member.name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-palace-red/10 text-palace-red font-song text-xs rounded-sm">{member.identity}</span>
                    <span className="px-2 py-0.5 bg-deep-blue/10 text-deep-blue font-song text-xs rounded-sm">{member.role}</span>
                  </div>
                  <p className="font-song text-xs text-deep-blue-light mb-3">{member.major}</p>
                  <p className="font-song text-sm text-deep-blue-light">{member.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="font-shufa text-2xl md:text-3xl text-deep-blue mb-4">指导老师</h2>
            <CloudDivider />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advisors.map((advisor, index) => (
              <motion.div
                key={advisor.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <FrameDecorations className="bg-palace-red/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-full ${advisor.avatarColor} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <span className="font-shufa text-2xl text-rice-paper">{advisor.avatarText}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-shufa text-xl text-deep-blue">{advisor.name}</h3>
                        <span className="px-2 py-0.5 bg-deep-blue/10 text-deep-blue font-song text-xs rounded-sm">{advisor.title}</span>
                      </div>
                      <p className="font-song text-sm text-deep-blue-light mt-1">{advisor.department}</p>
                      <p className="font-song text-sm text-palace-red mt-2">{advisor.research}</p>
                      
                      <button
                        onClick={() => toggleAdvisor(advisor.name)}
                        className="mt-3 flex items-center text-deep-blue-light hover:text-palace-red transition-colors text-sm font-song"
                      >
                        {expandedAdvisors.has(advisor.name) ? '收起简介' : '查看完整简介'}
                        <svg className={`w-4 h-4 ml-1 transition-transform duration-300 ${expandedAdvisors.has(advisor.name) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <AnimatePresence>
                        {expandedAdvisors.has(advisor.name) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-deep-blue-100">
                              <p className="font-song text-sm text-deep-blue-light leading-relaxed">
                                {advisor.fullBio}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </FrameDecorations>
              </motion.div>
            ))}
          </div>
          
          <p className="font-song text-deep-blue-light text-center mt-6">
            感谢两位老师的跨学科指导，为本项目提供了AI技术与设计美学的专业支持。
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-block">
            <div className="bg-rice-paper-light px-8 py-6 rounded-sm border border-deep-blue-100">
              <p className="font-shufa text-lg text-deep-blue mb-2">联系方式</p>
              <p className="font-song text-deep-blue-light">邮箱：3684553782@qq.com</p>
              <p className="font-song text-deep-blue-light">地址：江苏省无锡市滨湖区江南大学蠡湖校区</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-rice-paper-light rounded-sm border border-deep-blue-100 relative ${className}`}>
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-palace-red" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-palace-red" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-palace-red" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-palace-red" />
      {children}
    </div>
  )
}
